# 1. Kubernetes Secret: para armazenar variáveis de ambiente de forma segura.
# Os valores reais vêem do GitHub Secrets.
resource "kubernetes_secret" "app_secrets" {
  metadata {
    name = "${var.app_name}-secrets"
  }

  data = {
    # Exemplo: os valores virão dos secrets do repositório no GitHub
    # Passará esses valores através do workflow
    OPENAI_API_KEY = var.openai_api_key
    CNJ_API_KEY    = var.cnj_api_key
    PORT           = var.app_port
  }

  type = "Opaque"
}

# 2. Kubernetes Deployment: gerencia os pods da sua aplicação.
resource "kubernetes_deployment" "app_deployment" {
  metadata {
    name = var.app_name
    labels = {
      app = var.app_name
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = var.app_name
      }
    }

    template {
      metadata {
        labels = {
          app = var.app_name
        }
      }

      spec {
        container {
          name  = var.app_name
          image = var.app_image # A imagem vem da pipeline de CI/CD

          port {
            container_port = var.app_port
          }

          # Busca as variáveis de ambiente do Secret
          env_from {
            secret_ref {
              name = kubernetes_secret.app_secrets.metadata.0.name
            }
          }

          # Best Practice: Adicionar verificações de saúde
          liveness_probe {
            http_get {
              path = "/health"
              port = var.app_port
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = var.app_port
            }
            initial_delay_seconds = 15
            period_seconds        = 5
          }
        }
      }
    }
  }
}

# 3. Kubernetes Service: Expõe o Deployment para o mundo externo.
resource "kubernetes_service" "app_service" {
  metadata {
    name = "${var.app_name}-service"
  }

  spec {
    selector = {
      app = kubernetes_deployment.app_deployment.spec.0.template.0.metadata.0.labels.app
    }

    port {
      port        = 80
      target_port = var.app_port
      protocol    = "TCP"
    }

    type = "LoadBalancer" # Cria um Load Balancer na AWS para acesso externo
  }
}