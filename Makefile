REPORTER = spec
test:
	@$(MAKE) lint
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@NODE_ENV=test ./node_modules/.bin/mocha test/**/*.test.js -b --reporter $(REPORTER)

lint:
	./node_modules/.bin/jshint ./lib

test-cov:
	$(MAKE) lint
	@NODE_ENV=test ./node_modules/.bin/istanbul cover \
	./node_modules/mocha/bin/_mocha test/**/*.test.js -- -R spec

test-coveralls:
	@NODE_ENV=test ./node_modules/.bin/istanbul cover \
	./node_modules/mocha/bin/_mocha test/**/*.test.js --report lcovonly -- -R spec && \
		cat ./coverage/lcov.info | ./bin/coveralls.js --verbose

.PHONY: test