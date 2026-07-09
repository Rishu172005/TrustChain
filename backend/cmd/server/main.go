package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/trustchain/backend/internal/blockchain"
	"github.com/trustchain/backend/internal/config"
	"github.com/trustchain/backend/internal/database"
	"github.com/trustchain/backend/internal/handlers"
	"github.com/trustchain/backend/internal/middleware"
	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/internal/recommendation"
	"github.com/trustchain/backend/internal/repositories"
	"github.com/trustchain/backend/internal/services"
	"github.com/trustchain/backend/pkg/logger"
	"github.com/trustchain/backend/pkg/response"
)

const version = "1.0.0"

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Log.Level, os.Stdout)

	// ── Database ──────────────────────────────────────────────────────────────
	dbClient, err := database.Connect(context.Background(), cfg.MongoDB)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to mongodb")
	}
	defer func() {
		if err := dbClient.Disconnect(context.Background()); err != nil {
			log.Error().Err(err).Msg("error disconnecting from mongodb")
		}
	}()

	if err := database.CreateIndexes(context.Background(), dbClient.Database); err != nil {
		log.Fatal().Err(err).Msg("failed to create mongodb indexes")
	}
	log.Info().Msg("mongodb connected and indexes verified")

	// ── Providers ─────────────────────────────────────────────────────────────
	var blockchainProvider ports.BlockchainProvider
	var blockchainProviderName string
	switch cfg.Providers.Blockchain {
	case "polygon":
		blockchainProvider = blockchain.NewPolygonProvider("", "")
		blockchainProviderName = "polygon"
		log.Info().Msg("blockchain provider: polygon (stub)")
	default:
		blockchainProvider = blockchain.NewMockBlockchainProvider()
		blockchainProviderName = "mock"
		log.Info().Msg("blockchain provider: mock")
	}

	var recommendProvider ports.RecommendationProvider
	var recommendProviderName string
	switch cfg.Providers.Recommendation {
	case "federated":
		recommendProvider = recommendation.NewFederatedLearningProvider("")
		recommendProviderName = "federated"
		log.Info().Msg("recommendation provider: federated (stub)")
	default:
		recommendProvider = recommendation.NewMockRecommendationProvider()
		recommendProviderName = "mock"
		log.Info().Msg("recommendation provider: mock")
	}

	// ── Repositories ──────────────────────────────────────────────────────────
	poiRepo := repositories.NewPOIRepository(dbClient.Database)
	checkinRepo := repositories.NewCheckInRepository(dbClient.Database)
	reviewRepo := repositories.NewReviewRepository(dbClient.Database)

	// ── Services ──────────────────────────────────────────────────────────────
	checkinSvc := services.NewCheckInService(checkinRepo, poiRepo, blockchainProvider, log)
	reviewSvc := services.NewReviewService(reviewRepo, poiRepo, log)
	poiSvc := services.NewPOIService(poiRepo, log)
	healthSvc := services.NewHealthService(dbClient, blockchainProviderName, recommendProviderName, version)

	// ── Handlers ──────────────────────────────────────────────────────────────
	checkinHandler := handlers.NewCheckInHandler(checkinSvc, log)
	reviewHandler := handlers.NewReviewHandler(reviewSvc, log)
	recommendHandler := handlers.NewRecommendHandler(recommendProvider, recommendProviderName, log)
	tokenHandler := handlers.NewTokenHandler(blockchainProvider, blockchainProviderName, log)
	poiHandler := handlers.NewPOIHandler(poiSvc, log)
	healthHandler := handlers.NewHealthHandler(healthSvc, log)

	// ── Router ────────────────────────────────────────────────────────────────
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(middleware.CORS())
	router.Use(middleware.SecureHeaders())
	router.Use(middleware.Logger(log))
	router.Use(gin.Recovery())

	router.NoRoute(func(c *gin.Context) {
		response.NotFound(c, fmt.Sprintf("route %s %s not found", c.Request.Method, c.Request.URL.Path))
	})

	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.Get)
		v1.POST("/checkin", checkinHandler.Create)
		v1.POST("/review", reviewHandler.Create)
		v1.GET("/recommend", recommendHandler.Get)
		v1.GET("/token-balance", tokenHandler.GetBalance)
		v1.GET("/pois", poiHandler.List)
	}

	// ── HTTP Server with graceful shutdown ────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().
			Str("port", cfg.Server.Port).
			Str("version", version).
			Msg("trustchain backend started")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutdown signal received")
	shutdownCtx, cancel := context.WithTimeout(
		context.Background(),
		time.Duration(cfg.Server.ShutdownTimeout)*time.Second,
	)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("forced shutdown")
	}
	log.Info().Msg("server stopped cleanly")
}
