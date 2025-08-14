terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ARN da role para dar permissão a ela dentro do K8s
data "aws_iam_role" "github_actions_role" {
  name = "github-actions-eks-deploy-role"
}

# 1. Cria a VPC, Subnets e Gateways necessários para o EKS
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "${var.eks_cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = var.vpc_azs
  private_subnets = var.vpc_private_subnets
  public_subnets  = var.vpc_public_subnets

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    "Terraform"   = "true"
    "Environment" = "dev"
  }
}

# 2. Cria o Cluster EKS
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.8.4"

  cluster_name    = var.eks_cluster_name
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  # permissão à role do GitHub Actions
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = data.aws_iam_role.github_actions_role.arn
      username = "github-actions-admin"
      groups   = ["system:masters"] # Grupo de administradores do K8s
    }
  ]

  # Configuração do Node Group (as instâncias EC2 que rodarão os pods)
  eks_managed_node_groups = {
    main = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
    }
  }

  tags = {
    Environment = "dev"
    Project     = "EstagIArio"
  }
}

# 3. Usa uma fonte de dados para gerar um token de autenticação para o cluster
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

# 4. Configura o provider do Kubernetes para se conectar ao cluster
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}