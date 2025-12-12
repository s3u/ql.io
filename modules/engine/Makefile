all: clean install test

clean:
	-rm -fr node_modules

install:
	npm link ql.io-mutable-uri;\
	npm link ql.io-str-template;\
	npm link ql.io-uri-template;\
	npm link ql.io-compiler;\
	npm install;\
	npm link;\
	mkdir -p docs;
	# node_modules/.bin/dox --title ql.io --desc "Engine APIs" lib/*.js > docs/engine.html;

.PHONY : test
test: install
	npm test

test-part:
	npm test -- --ci --reporters=default --reporters=jest-junit

