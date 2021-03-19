# wwebdev-api
a lambda for fetching the weekly updates from mongodb

# running locally

```npm install lambda-local -g```

```npm run test```


# deploying
```rm function.zip```

```zip -r function.zip .```

```aws lambda update-function-code --function-name getWeeklies --zip-file fileb://function.zip```

