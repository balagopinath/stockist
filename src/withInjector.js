import React from "react";
import { withAuthenticator } from '@aws-amplify/ui-react';

const withInjector = WrapperComponent => {
    return class WithInjector extends React.Component {
        profiler() {
            return {
                show: function(userProfile) {

                }
            }
        }
        constructor({signOut, user}) {
            super()
            this.signOutOp = signOut;
            this.user = user;
        }
        render() {
            return <WrapperComponent logOutOp={this.signOutOp} logInUser={this.user} profileServ={this.profiler} />
        }
    }
}

export default withAuthenticator(withInjector);