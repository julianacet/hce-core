//go:build windows

package handlers

import (
	"fmt"
	"syscall"
	"unsafe"
)

func abrirArchivoSO(path string) error {
	shell32 := syscall.NewLazyDLL("shell32.dll")
	shellExecute := shell32.NewProc("ShellExecuteW")

	verb, _ := syscall.UTF16PtrFromString("open")
	file, _ := syscall.UTF16PtrFromString(path)

	ret, _, _ := shellExecute.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(file)),
		0, 0,
		uintptr(syscall.SW_SHOW),
	)

	// ShellExecute devuelve > 32 si tuvo éxito
	if ret <= 32 {
		return fmt.Errorf("ShellExecute falló con código %d", ret)
	}
	return nil
}
