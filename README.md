[<img src="https://s3-us-west-2.amazonaws.com/arc.codes/architect-logo-500b@2x.png" width=500>](https://www.npmjs.com/package/@architect/create)

# @architect/destroy

> `@architect/destroy` is a module that deletes a CloudFormation stack (application) generated with Architect.

A stack is a collection of AWS resources that you can manage as a single unit. In other words, you can create, update, or delete a collection of resources by creating, updating, or deleting stacks. All the resources in a stack are defined by the stack's AWS CloudFormation template. A stack, for instance, can include all the resources required to run a web application, such as a web server, a database, and networking rules. If you no longer require that web application, you can simply delete the stack, and all of its related resources are deleted.

## Installation

```js
npm i @architect/destroy
let destroy = require('@architect/destroy')
```

# API

## `destroy.dirty(callback)`

Destroys Function code to the staging environment _by ommitting CloudFormation
and messing with Lambda infrastructure directly_. There's a reason we called
this `dirty`. Hey, it works, and it's much faster.

## `destroy.sam({verbose, production}, callback)`

Destroys all infrastructure associated to your @architect app.

Set `verbose` to truthy to enable chatty mode. By default will only push to the staging environment unless `production` is truthy.



