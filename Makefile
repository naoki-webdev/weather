.PHONY: help setup up api frontend install server-install server-lint server-test server-build db-shell down logs ci verify verify-e2e verify\:e2e test-frontend e2e terraform-blueprint-init terraform-blueprint-validate terraform-blueprint-plan

DOCKER_COMPOSE := docker compose
WEB_SERVICE := web
FRONTEND_SERVICE := frontend
E2E_WEB_SERVICE := e2e_web
PLAYWRIGHT_SERVICE := playwright
VITE_HOST := 127.0.0.1
VITE_PORT := 5173
DB_SHELL_COMMAND ?= exec psql -U postgres -d weather_compare_development
TERRAFORM_BLUEPRINT_DIR := infra/terraform/render-blueprint-check
TERRAFORM ?= docker run --rm -v "$(CURDIR):/workspace" -w /workspace hashicorp/terraform:1.6.6

help:
	@echo "Available targets:"
	@echo "  make setup          Build and start the NestJS API and database"
	@echo "  make up             Start the API, database, and Vite frontend"
	@echo "  make api            Start the NestJS API and database"
	@echo "  make frontend       Launch the Vite dev server on $(VITE_HOST):$(VITE_PORT)"
	@echo "  make install        Install frontend dependencies"
	@echo "  make server-install Install NestJS dependencies"
	@echo "  make server-lint    Type-check the NestJS server"
	@echo "  make server-test    Run NestJS unit tests"
	@echo "  make server-build   Build the NestJS server"
	@echo "  make db-shell       Open psql in the database container"
	@echo "  make down           Stop docker compose services"
	@echo "  make logs           Follow database and API logs"
	@echo "  make ci             Run the TypeScript CI command set"
	@echo "  make verify         Run backend and frontend checks"
	@echo "  make verify-e2e     Run Playwright E2E only"
	@echo "  make terraform-blueprint-init      Initialize the Render Blueprint Terraform check"
	@echo "  make terraform-blueprint-validate  Validate the Render Blueprint Terraform check"
	@echo "  make terraform-blueprint-plan      Run the Render Blueprint Terraform check"

setup:
	$(DOCKER_COMPOSE) up -d --build db $(WEB_SERVICE)
	@$(MAKE) server-install
	@$(MAKE) install
	@echo "== NestJS setup complete =="

up:
	@$(MAKE) setup
	@$(MAKE) frontend

api:
	$(DOCKER_COMPOSE) up -d --build db $(WEB_SERVICE)

frontend:
	$(DOCKER_COMPOSE) up $(FRONTEND_SERVICE)

install:
	$(DOCKER_COMPOSE) run --rm $(FRONTEND_SERVICE) npm ci

server-install:
	$(DOCKER_COMPOSE) exec -T $(WEB_SERVICE) sh -lc "cd /app/server && npm ci && npm run prisma:generate"

server-lint:
	$(DOCKER_COMPOSE) exec -T $(WEB_SERVICE) sh -lc "cd /app/server && npm run lint"

server-test:
	$(DOCKER_COMPOSE) exec -T $(WEB_SERVICE) sh -lc "cd /app/server && npm test -- --runInBand"

server-build:
	$(DOCKER_COMPOSE) exec -T $(WEB_SERVICE) sh -lc "cd /app/server && npm run build"

db-shell:
	$(DOCKER_COMPOSE) exec db sh -lc "$(DB_SHELL_COMMAND)"

down:
	$(DOCKER_COMPOSE) down

logs:
	$(DOCKER_COMPOSE) logs -f db $(WEB_SERVICE)

ci:
	@$(MAKE) verify

verify:
	$(DOCKER_COMPOSE) up -d --build db $(WEB_SERVICE)
	@$(MAKE) server-lint
	@$(MAKE) server-test
	@$(MAKE) server-build
	$(DOCKER_COMPOSE) run --rm $(FRONTEND_SERVICE) sh -lc "npm ci && npm run lint && npm run test:frontend && npm run build"

verify-e2e:
	$(DOCKER_COMPOSE) up -d --build db $(E2E_WEB_SERVICE)
	$(DOCKER_COMPOSE) run --rm $(PLAYWRIGHT_SERVICE) sh -lc "npm ci && npm run test:e2e"

verify\:e2e: verify-e2e

test-frontend:
	$(DOCKER_COMPOSE) run --rm $(FRONTEND_SERVICE) sh -lc "npm ci && npm run lint && npm run test:frontend"

e2e:
	@$(MAKE) verify-e2e

terraform-blueprint-init:
	$(TERRAFORM) -chdir=$(TERRAFORM_BLUEPRINT_DIR) init

terraform-blueprint-validate:
	$(TERRAFORM) -chdir=$(TERRAFORM_BLUEPRINT_DIR) validate

terraform-blueprint-plan:
	$(TERRAFORM) -chdir=$(TERRAFORM_BLUEPRINT_DIR) plan
