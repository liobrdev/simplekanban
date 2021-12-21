import React, { Component, FocusEvent, InputHTMLAttributes } from 'react';


interface Props extends InputHTMLAttributes<HTMLInputElement>{
  label?: string;
  showAsterisk?: boolean;
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
    const { className, id, showAsterisk, ...rest } = this.props;
    const { disabled, label, name, required } = rest;

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
        {required && showAsterisk && (
          <span className='Input-asterisk'>*</span>
        )}
      </div>
    );
  }
};