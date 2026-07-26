package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all application configuration.
// It is loaded once at startup and injected into every subsystem constructor.
// No subsystem reads os.Getenv or viper directly.
type Config struct {
	Server    ServerConfig
	MongoDB   MongoDBConfig
	Log       LogConfig
	Providers ProviderConfig
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Port            string
	ShutdownTimeout int // seconds
}

// MongoDBConfig holds database connection settings.
type MongoDBConfig struct {
	URI            string
	DatabaseName   string
	ConnectTimeout int // seconds
}

// LogConfig holds logging settings.
type LogConfig struct {
	Level string
}

// ProviderConfig holds external provider selection.
type ProviderConfig struct {
	Blockchain            string // mock | polygon | hardhat
	Recommendation        string // mock | federated | external
	HardhatRPCURL         string // used when Blockchain=hardhat
	HardhatDeploymentPath string // path to deployments/localhost.json
}

// Load reads configuration from environment variables and an optional .env file.
// All keys have sane defaults so the application starts without a .env file.
func Load() (*Config, error) {
	v := viper.New()

	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")

	v.SetDefault("PORT", "8080")
	v.SetDefault("SHUTDOWN_TIMEOUT", 10)
	v.SetDefault("MONGODB_URI", "mongodb://localhost:27017")
	v.SetDefault("DATABASE_NAME", "trustchain")
	v.SetDefault("MONGODB_CONNECT_TIMEOUT", 10)
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("BLOCKCHAIN_PROVIDER", "mock")
	v.SetDefault("RECOMMENDATION_PROVIDER", "mock")
	v.SetDefault("HARDHAT_RPC_URL", "http://127.0.0.1:8545")
	v.SetDefault("HARDHAT_DEPLOYMENT_PATH", "../contracts/trustchain-task6-s1/deployments/localhost.json")

	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config file: %w", err)
		}
	}

	cfg := &Config{
		Server: ServerConfig{
			Port:            v.GetString("PORT"),
			ShutdownTimeout: v.GetInt("SHUTDOWN_TIMEOUT"),
		},
		MongoDB: MongoDBConfig{
			URI:            v.GetString("MONGODB_URI"),
			DatabaseName:   v.GetString("DATABASE_NAME"),
			ConnectTimeout: v.GetInt("MONGODB_CONNECT_TIMEOUT"),
		},
		Log: LogConfig{
			Level: v.GetString("LOG_LEVEL"),
		},
		Providers: ProviderConfig{
			Blockchain:            v.GetString("BLOCKCHAIN_PROVIDER"),
			Recommendation:        v.GetString("RECOMMENDATION_PROVIDER"),
			HardhatRPCURL:         v.GetString("HARDHAT_RPC_URL"),
			HardhatDeploymentPath: v.GetString("HARDHAT_DEPLOYMENT_PATH"),
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.Server.Port == "" {
		return fmt.Errorf("PORT must not be empty")
	}
	if c.MongoDB.URI == "" {
		return fmt.Errorf("MONGODB_URI must not be empty")
	}
	if c.MongoDB.DatabaseName == "" {
		return fmt.Errorf("DATABASE_NAME must not be empty")
	}
	return nil
}
