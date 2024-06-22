SHELL := /bin/bash

generate-new-service:
	rm -rf .out
	node_modules/.bin/co-coder run \
		--task "Create a new service called 'deleteTodo' in apigateway module creating all openapi defs along with handlers, connectors and all boilerplace code for it in the correct places. Create a sample interface for this service as a starting point." \
		--example "Use getTodo for a sample project structure" \
		--info "This workspace is a monorepo with lots of different services and libraries reused among the packages. Each service has a CDK code, Lambda logic and a connector for other clients to connect to it." \
		--base-dir "." \
		--files "src/apigateway/handlers/http/getTodo/**/*.ts,src/apigateway/cdk.ts" \
		--files-ignore "**/*.test.ts" \
		--model gpt-4-turbo \
		--output .out \
		--max-tokens-total 200000 \
		--max-tokens-files 128000 \
		--max-file-requests 5 \
		--max-file-size 50000 \
		--log debug \
		--api-provider azure \
		--api-url $$(security find-generic-password -w -a flaviostutz -s azure-openai-api-url) \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s azure-openai-api-key)"


build: install prereqs
	pnpm exec tsc --outDir dist
	@set -x; STAGE=$${STAGE} pnpm exec cdk -o dist synth

build-dev:
	STAGE=dev make build

lint:
	pnpm exec eslint ./src --ext .ts

lint-fix:
	pnpm exec eslint . --ext .ts --fix

test: unit-tests

unit-tests:
	# pnpm exec jest --verbose

clean:
	rm -rf node_modules
	rm -rf dist

all: build lint test

install:
	corepack enable
	@# update local tar gz checksum
	pnpm update co-coder
	pnpm install --frozen-lockfile --config.dedupe-peer-dependents=false

deploy: prereqs
	@set -x; pnpm exec cdk -o dist deploy --method-direct --require-approval never

undeploy: prereqs
	@set -x; pnpm exec cdk -o dist destroy -f --require-approval never

prereqs:
	@if [ "$${STAGE}" == "" ]; then \
		echo "ENV STAGE is required"; \
		exit 1; \
	fi
