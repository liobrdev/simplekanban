import React, { Component } from "react";


interface State {
  messageOn: boolean;
}

class DashboardListEmpty extends Component<{}, State> {
  private loadingTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: {}) {
    super(props);
    this.state = { messageOn: false };
    this.loadingTimeout = undefined;
  }

  componentDidMount() {
    this.loadingTimeout = setTimeout(() => {
      this.setState({ messageOn: true });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
  }

  render() {
    const { messageOn } = this.state;

    return messageOn ? (
      <p className='DashboardListBoards-message'>
        You don&apos;t have any boards at the moment.
        Tap <span>+</span> to create one!
      </p>
    ) : null;
  }
}

export default DashboardListEmpty;