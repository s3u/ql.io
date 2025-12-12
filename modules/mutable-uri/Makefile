all: clean install test

clean:
	-rm -fr node_modules

install:
	npm install;\
	npm link;

.PHONY : test
test: install
	npm test

test-part:
	npm test -- --ci --reporters=default --reporters=jest-junit

