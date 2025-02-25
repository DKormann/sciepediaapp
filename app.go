package main

import (
	"context"
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

const root = "~/Sciepedia/files"

func (a *App) GetFile(path string) string {

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Sprintf("Error: %s", err)
	}
	return string(data)
}

func (a *App) OpenFileDialog() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{})

	println("cts", a.ctx)
	if err != nil {
		return "", err
	}
	return path, nil
}
