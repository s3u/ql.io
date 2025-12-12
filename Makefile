all: clean install 

clean:
	-rm -fr node_modules
	-rm -fr modules/*/node_modules
	-rm -fr logs
	-rm -fr pids

install:
	-mkdir -p pids logs tables routes
	npm install --workspaces

test:
	npm run test:app
	npm run test:compiler
	npm run test:console
	npm run test:engine
	npm run test:mutable-uri
	npm run test:str-template
	npm run test:uri-template

test-engine:
	npm run test:engine

test-console:
	npm run test:console

test-compiler:
	npm run test:compiler

test-app:
	npm run test:app

test-mutable-uri:
	npm run test:mutable-uri

test-str-template:
	npm run test:str-template

test-uri-template:
	npm run test:uri-template

.PHONY: all clean install test test-engine test-console test-compiler test-app test-mutable-uri test-str-template test-uri-template
