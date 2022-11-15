import { observer, useLocalObservable } from "mobx-react-lite";
import {
  Alert,
  Button,
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Nav,
  NavItem,
  NavLink,
  Row,
  Table,
} from "reactstrap";
import { Collection, Request } from "./collection";
import petstore from "./petstore";
import { CollectionConfig } from "./types";

type CollectionViewProps = { collection: Collection };
type RequestViewProps = {
  request: Request;
  onSelectRequest?: (req: Request) => void;
};

const RequestView = observer(
  ({ request, onSelectRequest }: RequestViewProps) => {
    if (request == null) {
      return <></>;
    }
    return (
      <div>
        <h6>
          {request.method} {request.name}
        </h6>
        <FormGroup row>
          <Label sm={2}>Url</Label>
          <Col sm={6}>
            <Input
              type="text"
              value={request.url}
              onChange={(e) => (request.url = e.target.value)}
            ></Input>
          </Col>
        </FormGroup>
        <FormGroup row>
          <Label sm={2}>Body</Label>
          <Col sm={6}>
            <Input
              type="textarea"
              value={request.body}
              rows="4"
              onChange={(e) => (request.body = e.target.value)}
            ></Input>
          </Col>
        </FormGroup>
        <h6>Variables</h6>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Expr</th>
              <th>Curent Value</th>
              <th>Set By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {request.vars.map(($var) => (
              <tr key={$var.name}>
                <td valign="middle">
                  {$var.name}
                  {$var.unused ? " (unused)" : ""}
                  {$var.evalOrder === "AFTER_RESPONSE" ? " (response)" : ""}
                </td>
                <td valign="middle">
                  <Input
                    type="text"
                    value={$var.expr}
                    onChange={(e) => ($var.expr = e.target.value)}
                  ></Input>
                </td>
                <td valign="middle">{$var.value}</td>
                <td valign="middle">
                  <a
                    href="#"
                    onClick={() => {
                      if (onSelectRequest) onSelectRequest($var.setBy);
                    }}
                  >
                    {$var.setBy?.name}
                  </a>
                </td>
                <td valign="middle">
                  {($var.unused || $var.evalOrder === "AFTER_RESPONSE") && (
                    <Button
                      size="sm"
                      color="danger"
                      onClick={() => request.removeVar($var)}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }
);

const CollectionView = observer(({ collection }: CollectionViewProps) => {
  const state = useLocalObservable(() => ({
    selectedRequest: collection.requests[0],
  }));

  return (
    <div>
      <Alert
        color="primary"
        className={collection.message ? "visible" : "invisible"}
      >
        {collection.message}
      </Alert>
      <Row>
        <Col sm="3" className="bg-light">
          <h6>Collections</h6>
          <div className="ms-4">
            <h6>
              {collection.name}
              <Button
                color="primary"
                size="sm"
                className="ms-4"
                onClick={() => collection.run()}
              >
                <i className="fa fa-rocket"></i> Run
              </Button>
            </h6>
            <Nav vertical>
              {collection.requests.map((req) => (
                <NavItem key={req.name} active={req == state.selectedRequest}>
                  <NavLink
                    href="#"
                    onClick={() => (state.selectedRequest = req)}
                  >
                    {req.name}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </div>
        </Col>
        <Col sm="9">
          <RequestView
            request={state.selectedRequest}
            onSelectRequest={(req) => (state.selectedRequest = req)}
          ></RequestView>
        </Col>
      </Row>
    </div>
  );
});

export default function App() {
  const collection = new Collection(petstore as CollectionConfig);
  return (
    <Container>
      <CollectionView collection={collection}></CollectionView>
    </Container>
  );
}
