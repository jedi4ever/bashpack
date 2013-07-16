REPORTER = dot

MOCHA ?= ./node_modules/.bin/mocha
JSCOVERAGE ?= ./node_modules/.bin/jscoverage
JSHINT ?= ./node_modules/.bin/jshint

SRC = ./lib/cli.js ./lib/bashpack.js ./lib/utils/merge.js ./lib/utils/logger.js

test: lint $(SRC) ./node_modules
	@$(MOCHA) \
		--require test/common \
		--reporter $(REPORTER) \
		--growl \
		$(TESTS)

lint: $(SRC)
	@$(JSHINT) $(SRC)
