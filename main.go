package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

func main() {
	targetHost := os.Getenv("TARGET_HOST")
	serverPort := os.Getenv("SERVER_PORT")
	// Configuração do proxy reverso
	target, err := url.Parse(targetHost)
	if err != nil {
		log.Fatal("Erro ao analisar URL de destino:", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	// Handler principal
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Tenta primeiro servir arquivos estáticos
		if serveStaticFile(w, r) {
			return
		}

		// Se o arquivo estático não existir, redireciona para o servidor de destino
		log.Printf("Redirecionando requisição: %s %s", r.Method, r.URL.Path)
		proxy.ServeHTTP(w, r)
	})

	// Inicia o servidor
	log.Printf("Servidor proxy rodando em http://localhost:%s", serverPort)
	log.Printf("Redirecionando todas as requisições para " + targetHost)
	log.Fatal(http.ListenAndServe(":"+serverPort, nil))
}

// serveStaticFile tenta servir um arquivo estático e retorna true se bem-sucedido
func serveStaticFile(w http.ResponseWriter, r *http.Request) bool {
	// Define o diretório de arquivos estáticos
	staticDir := "./static"

	// Constrói o caminho do arquivo
	path := r.URL.Path
	if path == "/" {
		path = "/index.html"
	}

	filePath := staticDir + path

	// Verifica se o arquivo existe
	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		return false
	}

	// Serve o arquivo estático
	http.ServeFile(w, r, filePath)
	return true
}
