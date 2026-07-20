function Slider({ className = '', max, min, onValueChange, step, value }) {
  return (
    <input
      className={`loom-slider ${className}`}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(event) => onValueChange([Number(event.target.value)])}
    />
  )
}

export { Slider }
