all: clean install test

clean:
	-rm -fr node_modules

install:
	npm install;\
	npm link;

.PHONY : test
test: install
	npm test

test-coverage:
	npm run test:coverage

test-watch:
	npm run test:watch
