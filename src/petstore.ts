import { CollectionConfig } from "./types";

const petstore: CollectionConfig = {
  name: "Add Pet Workflow",
  baseUrl: "https://petstore.swagger.io/v2",
  requests: [
    {
      name: "Create Pet",
      method: "POST",
      url: "/pet",
      body: `{
  "name": "{{ petName }}"
}`,
      vars: [
        { name: "petId", expr: "$res.data.id" },
        { name: "petName", expr: '"Bruno"' },
      ],
    },
    {
      name: "Get Pet",
      method: "GET",
      url: "/pet/{{petId}}",
      vars: [{ name: "myPet", expr: "_.get($res, 'data.name')" }],
    },
  ],
};

export default petstore;
