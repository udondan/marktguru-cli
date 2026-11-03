SHELL := /bin/bash -euo pipefail

NO_COLOR=\x1b[0m
TARGET_COLOR=\x1b[96m

build:
	@echo -e "$(TARGET_COLOR)Running build$(NO_COLOR)"
	@npm run build

clean:
	@echo -e "$(TARGET_COLOR)Running clean$(NO_COLOR)"
	@rm -rf node_modules package-lock.json dist

install:
	@echo -e "$(TARGET_COLOR)Running install$(NO_COLOR)"
	@npm clean-install --prefer-offline --cache .npm

test:
	@echo -e "$(TARGET_COLOR)Running tests$(NO_COLOR)"
	@npm test

eslint:
	@echo -e "$(TARGET_COLOR)Running eslint $$(npx eslint --version)$(NO_COLOR)"
	@npx eslint .; \
	echo "Passed"

format:
	@echo -e "$(TARGET_COLOR)Running prettier$(NO_COLOR)"
	@npx prettier --write .

validate-package:
	@echo -e "$(TARGET_COLOR)Checking package content$(NO_COLOR)"
	@\
	if ! TARBALL=$$(npm pack --quiet) || [ -z "$$TARBALL" ]; then \
		echo "❌ npm pack failed"; \
		exit 1; \
	fi; \
	TARBALL=$$(printf '%s\n' "$$TARBALL" | tail -n 1); \
	if [ ! -f "$$TARBALL" ]; then \
		echo "❌ npm pack package file not found: $$TARBALL"; \
		exit 1; \
	fi; \
	trap 'rm -f "$$TARBALL"' EXIT; \
	if ! tar -tf "$$TARBALL" >/dev/null; then \
		echo "❌ Failed to list tarball contents"; \
		exit 1; \
	fi; \
	FILES_TO_CHECK="dist/cli.js dist/api.js dist/auth.js dist/config.js dist/query.js LICENSE README.md"; \
	MISSING_FILES=""; \
	for file in $$FILES_TO_CHECK; do \
		if ! tar -tf "$$TARBALL" "package/$$file" >/dev/null 2>&1; then \
			MISSING_FILES="$$MISSING_FILES $$file"; \
		fi; \
	done; \
	if [ -n "$$MISSING_FILES" ]; then \
		echo "❌ The following files are NOT included in the package:$$MISSING_FILES"; \
		exit 1; \
	fi; \
	echo "✅ Package content looks good"
