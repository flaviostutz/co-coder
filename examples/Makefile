SHELL := /bin/bash

generate-new-service:
	@if [ ! -f ".out/conversation.json" ]; then \
		rm -rf .out; \
	fi
	node_modules/.bin/co-coder run \
		--task "Create a new service called 'deleteTodo' in apigateway module creating all openapi defs along with handlers, connectors and all boilerplace code for it in the correct places. Create a sample interface for this service as a starting point." \
		--example "Use getTodo for a sample project structure" \
		--info "This workspace is a monorepo with lots of different services and libraries reused among the packages. Each service has a CDK code, Lambda logic and a connector for other clients to connect to it." \
		--base-dir "." \
		--files "src/apigateway/handlers/http/getTodo/**/*.ts,src/apigateway/cdk.ts" \
		--model gpt-4-turbo \
		--conversation-file "conversation.json" \
		--output .out \
		--max-tokens-total 50000 \
		--log debug \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s flaviostutz-openai-apikey)"

generate-services-from-wsdl:
	@if [ ! -f ".out/conversation.json" ]; then \
		rm -rf .out; \
	fi
	pnpm dlx co-coder run \
		--task "Create all services found in sample.wsdl in Lambda/CDK, creating all openapi defs along with handlers, connectors and all boilerplace code for it in the correct places. Create a sample interface for each service as a starting point." \
		--example "Use getTodo for a sample project structure" \
		--info "This workspace is a monorepo with lots of different services and libraries reused among the packages. Each service has a CDK code, Lambda logic and a connector for other clients to connect to it." \
		--base-dir "." \
		--files "sample.wsdl,src/apigateway/handlers/http/getTodo/**/*.ts,src/apigateway/cdk.ts" \
		--model gpt-4-turbo \
		--output .out \
		--max-tokens-total 200000 \
		--log debug \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s flaviostutz-openai-apikey)"

generate-add-comments:
	@if [ ! -f ".out/conversation.json" ]; then \
		rm -rf .out; \
	fi
	npx -y co-coder run \
		--task "add more comments to the existing codes" \
		--base-dir "." \
		--files "**/cdk/**" \
		--model gpt-4-turbo \
		--output "." \
		--max-tokens-total 200000 \
		--log debug \
		--api-key "$$(security find-generic-password -w -a flaviostutz -s flaviostutz-openai-apikey)"

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
