# Bruno Vars

This is a demo of collection variables

A pet is created using a POST and then fetched via another GET request using the id returned in the first response!

1. Variables can be set in one request...
2. And used in other requests further down the collection
3. Variables are declared and parsed automatically from url and body
4. Variables are declared by surrounding with double curly braces `{{ VAR }}` as in Postman
5. The main innovation is how variables are set after a sucessful response.<br>
   Rather than running a generic "post" response script, variables are explicitly set using simple expressions, or more complex expressions using lodash
6. The distinction between "before request" variables and "post response" variables helps to reason about the workflow and interdependencies between requests.
