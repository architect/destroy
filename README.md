[<img src="https://s3-us-west-2.amazonaws.com/arc.codes/architect-logo-500b@2x.png" width=500>](https://www.npmjs.com/package/@architect/create)

# @architect/destroy

> Architect serverless framework module for destroying projects created with Architect

Architect Destroy destroys Architect-generated projects; each Architect project generates a CloudFormation stack, which is the primary resource deleted by Destroy.

A CloudFormation stack is a collection of AWS resources that you can manage as a single unit; this includes the resources required to . If you no longer require that web application, you can simply delete the stack, and all of its related resources are deleted.


# API

## `destroy.dirty(callback)`

Destroys Function code to the staging environment _by ommitting CloudFormation and messing with Lambda infrastructure directly_. There's a reason we called this `dirty`. Hey, it works, and it's much faster.


## `destroy.sam({verbose, production}, callback)`

Destroys all infrastructure associated to your @architect app.

Set `verbose` to truthy to enable chatty mode. By default will only push to the staging environment unless `production` is truthy.
