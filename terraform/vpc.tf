# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name          = "${var.project_name}-vpc-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name          = "${var.project_name}-igw-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name          = "${var.project_name}-public-subnet-${count.index + 1}-${var.environment}"
    Type          = "public"
    ResourcePrefix = var.project_name
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name          = "${var.project_name}-private-subnet-${count.index + 1}-${var.environment}"
    Type          = "private"
    ResourcePrefix = var.project_name
  }
}

# Elastic IPs for NAT Gateways (single NAT for cost optimization)
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.private_subnet_cidrs)) : 0
  domain = "vpc"

  tags = {
    Name          = "${var.project_name}-nat-eip-${var.single_nat_gateway ? "single" : count.index + 1}-${var.environment}"
    ResourcePrefix = var.project_name
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways (single NAT for cost optimization)
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.public_subnet_cidrs)) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name          = "${var.project_name}-nat-${var.single_nat_gateway ? "single" : count.index + 1}-${var.environment}"
    ResourcePrefix = var.project_name
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name          = "${var.project_name}-public-rt-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Route Table Associations for Public Subnets
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Tables for Private Subnets (single NAT Gateway optimization)
resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? length(var.private_subnet_cidrs) : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name          = "${var.project_name}-private-rt-${count.index + 1}-${var.environment}"
    ResourcePrefix = var.project_name
  }
}

# Route Table Associations for Private Subnets
resource "aws_route_table_association" "private" {
  count          = var.enable_nat_gateway ? length(var.private_subnet_cidrs) : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

