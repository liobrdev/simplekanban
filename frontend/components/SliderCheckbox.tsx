import React, { Component, FocusEvent, InputHTMLAttributes } from 'react';


interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showAsterisk?: boolean;
}

export default class SliderCheckbox extends Component<Props> {
  handleFocus(e: FocusEvent<HTMLInputElement>) {
    e.preventDefault();
    e.target.select();
  }

  render() {
    const { className, id, showAsterisk, ...rest } = this.props;
    const { label, name, required } = rest;

    return (
      <div
        id={id}
        className={`Input Input--sliderCheckbox${
          !!className ? ' ' + className : ''
        }`}
      >
        {!!label && <label htmlFor={name}>{label}</label>}
        <div className='SliderCheckbox SliderCheckbox--round'>
          <input
            { ...rest }
            type='checkbox'
            id={name}
            onFocus={this.handleFocus}
          />
          <span className='SliderCheckbox-slider SliderCheckbox-slider--round' />
        </div>
        {required && showAsterisk && (
          <span className='Input-asterisk'>*</span>
        )}
      </div>
    );
  }
};