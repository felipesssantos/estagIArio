# Variáveis da Aplicação (usadas pelo app.tf)
variable "app_image" {
  type        = string
  description = "A imagem Docker da aplicação, incluindo a tag."
}
variable "openai_api_key" {
  type        = string
  description = "A chave de API da OpenAI."
  sensitive   = true
}
variable "cnj_api_key" {
  type        = string
  description = "A chave de API do CNJ."
  sensitive   = true
}

# Variáveis do Cluster e da Rede
variable "aws_region" {
  type        = string
  description = "Região da AWS onde os recursos serão criados."
  default     = "us-east-1"
}

variable "eks_cluster_name" {
  type        = string
  description = "O nome para o novo cluster EKS."
  default     = "estagiario-cluster"
}

variable "vpc_cidr" {
  type        = string
  description = "Bloco CIDR para a nova VPC."
  default     = "10.0.0.0/16"
}

variable "vpc_azs" {
  type        = list(string)
  description = "Zonas de Disponibilidade para a VPC."
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "vpc_private_subnets" {
  type        = list(string)
  description = "Blocos CIDR para as subnets privadas."
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "vpc_public_subnets" {
  type        = list(string)
  description = "Blocos CIDR para as subnets públicas."
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}