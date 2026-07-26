package database

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"

	"github.com/trustchain/backend/internal/config"
)

// Client wraps a mongo.Client and exposes the target database.
type Client struct {
	client   *mongo.Client
	Database *mongo.Database
}

// Connect establishes a connection to MongoDB and verifies it with a ping.
func Connect(ctx context.Context, cfg config.MongoDBConfig) (*Client, error) {
	timeout := time.Duration(cfg.ConnectTimeout) * time.Second

	connCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	opts := options.Client().
		ApplyURI(cfg.URI).
		SetConnectTimeout(timeout).
		SetServerSelectionTimeout(timeout)

	client, err := mongo.Connect(connCtx, opts)
	if err != nil {
		return nil, fmt.Errorf("connecting to mongodb: %w", err)
	}

	pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
	defer pingCancel()

	if err := client.Ping(pingCtx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("pinging mongodb: %w", err)
	}

	return &Client{
		client:   client,
		Database: client.Database(cfg.DatabaseName),
	}, nil
}

// Ping checks MongoDB connectivity and returns latency.
func (c *Client) Ping(ctx context.Context) (time.Duration, error) {
	start := time.Now()
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := c.client.Ping(pingCtx, readpref.Primary()); err != nil {
		return 0, fmt.Errorf("ping failed: %w", err)
	}
	return time.Since(start), nil
}

// Disconnect gracefully closes the MongoDB connection.
func (c *Client) Disconnect(ctx context.Context) error {
	return c.client.Disconnect(ctx)
}
