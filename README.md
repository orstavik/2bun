## 2bun

### Motivation
This service was created to easily bundle online assets in to one file that can be served online.

### Use
To use the service all you need to do is to strip assets href from protocol name and append it to the service href ([https://2bun.no/](https://2bun.no/)).
For example to bundle together Polymer at this link ([https://polygit.org/components/polymer/polymer.html](https://polygit.org/components/polymer/polymer.html)) type this address into URL bar: [https://2bun.no/polygit.org/components/polymer/polymer.html](https://2bun.no/polygit.org/components/polymer/polymer.html) to produce bundled file. If you want to cache and serve those files forever from the server use our another service - [2cdn](https://gitlab.com/orstavik/two-cdn-no).

### Local debugging
First you need to clone repository and install dependencies:
```
git clone https://gitlab.com/orstavik/two-bun-no
cd two-bun-no
cd functions
npm install
cd..
```
To just serve the service locally you need to use [firebase tools]:
```
npm install -g firebase-tools
firebase serve --only functions,hosting
```
To debug the service via Chrome Devtools you need to use [functions emulator](https://www.npmjs.com/package/@google-cloud/functions-emulator):
```
npm install -g @google-cloud/functions-emulator
functions start
functions inspect [nameOfYourFunction]
```
If you function will not be automatically registered by the functions emulator when it start you need to add it manually:
```
functions deploy [nameOfYourFunction] --trigger-http
```