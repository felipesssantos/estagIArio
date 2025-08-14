variable "app_image" {
  type        = string
  description = "A imagem Docker da aplicação, incluindo a tag (ex: 12345.dkr.ecr.us-east-1.amazonaws.com/repo:latest)."
}

variable "app_name" {
  type        = string
  description = "O nome da aplicação."
  default     = "estagiario-app"
}

variable "app_port" {
  type        = number
  description = "A porta em que a aplicação Node.js roda dentro do contêiner."
  default     = 3000
}

variable "replicas" {
  type        = number
  description = "O número de réplicas (pods) para a aplicação."
  default     = 2
}

variable "eks_cluster_name" {
  type        = string
  description = "O nome do cluster EKS na AWS."
  default     = 2
}