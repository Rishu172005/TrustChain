package response

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/trustchain/backend/internal/models"
)

// Success writes a 2xx JSON response using the standard envelope.
func Success(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, models.APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Fail writes an error JSON response using the standard envelope.
func Fail(c *gin.Context, statusCode int, message string, err string) {
	c.JSON(statusCode, models.APIResponse{
		Success: false,
		Message: message,
		Error:   err,
	})
}

// BadRequest writes a 400 response.
func BadRequest(c *gin.Context, err string) {
	Fail(c, http.StatusBadRequest, "Invalid request body", err)
}

// UnprocessableEntity writes a 422 response.
func UnprocessableEntity(c *gin.Context, err string) {
	Fail(c, http.StatusUnprocessableEntity, "Validation failed", err)
}

// NotFound writes a 404 response.
func NotFound(c *gin.Context, err string) {
	Fail(c, http.StatusNotFound, "Resource not found", err)
}

// InternalServerError writes a 500 response.
func InternalServerError(c *gin.Context) {
	Fail(c, http.StatusInternalServerError, "An unexpected error occurred", "internal server error")
}

// ServiceUnavailable writes a 503 response.
func ServiceUnavailable(c *gin.Context, err string) {
	Fail(c, http.StatusServiceUnavailable, "Service unavailable", err)
}
