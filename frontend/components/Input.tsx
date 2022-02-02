import React, { Component, FocusEvent, InputHTMLAttributes } from 'react';


interface Props extends InputHTMLAttributes<HTMLInputElement>{
  label?: string | JSX.Element;
  showAsterisk?: boolean;
  showObelisk?: boolean;
}

export default class Input extends Component<Props> {
  handleFocus(e: FocusEvent<HTMLInputElement>) {
    e.preventDefault();
    if (e.target.type === 'email') {
      e.target.setAttribute('type', 'text');
      e.target.setSelectionRange(0, 500);
      e.target.setAttribute('type', 'email');
    } else if (e.target.type === 'number' || e.target.type === 'checkbox') {
      e.target.select();
    } else {
      e.target.setSelectionRange(0, 500);
    }
  }

  render() {
    const { className, id, showAsterisk, showObelisk, ...rest } = this.props;
    const { disabled, label, name } = rest;

    return (
      <div className={`Input${!!className ? ' ' + className : ''}`} id={id}>
        {!!label && (
          <label
            htmlFor={name}
            style={disabled ? { opacity: '0.66667' } : undefined}
          >
            {label}
          </label>
        )}
        <input
          { ...rest }
          id={name}
          onFocus={this.handleFocus}
        />
        {showAsterisk && (
          <span className='Input-asterisk'>*</span>
        )}
        {showObelisk && (
          <span className='Input-obelisk'>&dagger;</span>
        )}
      </div>
    );
  }
};