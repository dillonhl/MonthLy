import React from "react";
import { PlaidLink } from "react-plaid-link";

export const LinkButton = (props) => {
  const onExit = (error, metadata) => console.log('onExit', error, metadata);

const onEvent = (eventName, metadata) => {
  console.log('onEvent', eventName, metadata);
}

const onSuccess = (token, metadata) =>{
  console.log('onSuccess', token, metadata);
  props.linkBank(token);
}

return (
  <>
    <PlaidLink
      className="LinkButton"
      token={props.token ? props.token : ''}
      onExit={onExit}
      onSuccess={onSuccess}
      onEvent={onEvent}
    >
      Connect your bank!
    </PlaidLink>
  </>
  );
}