import React, { Component } from "react";


interface Props {
  className?: string;
}

interface State {
  spinnerOn: boolean;
}

export default class LoadingView extends Component<Props, State> {
  private loadingTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.state = { spinnerOn: false };
    this.loadingTimeout = undefined;
  }

  componentDidMount() {
    this.loadingTimeout = setTimeout(() => {
      this.setState({ spinnerOn: true });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
  }

  render() {
    const { spinnerOn } = this.state;
    const { className } = this.props;

    return (
      <div className={`LoadingView${!!className ? ' ' + className : ''}`}>
        <div className={
          `LoadingView-spinner${spinnerOn ? ' is-spinning' : ''}`
        }/>
      </div>
    );
  }
}