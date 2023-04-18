import { useState } from 'react'

export type SelectorOption = string | number | {
  title?: string
  value: number | string
}

export interface SelectorProps {
  title: string
  options: SelectorOption[]
  value: number | string | Array<number | string>
  multiple?: boolean
  onInput?: (arg: any | any[]) => void
  hiddenDefault?: boolean
}

export default function Selector (props: SelectorProps): JSX.Element {
  const [
    modalHidden,
    setModalHidden
  ] = useState(props.hiddenDefault ?? true)
  const selected = Array.isArray(props.value)
    ? new Set(props.value)
    : new Set([props.value])
  const optionHandler = (value: number | string): void => {
    if (props.multiple !== true) selected.clear()

    if (selected.has(value)) selected.delete(value)
    else selected.add(value)

    if (props.multiple === true) props.onInput?.([...selected])
    else props.onInput?.(selected.values().next().value)
  }

  return (
    <>
      <div className={`selector-container ${modalHidden ? '' : 'selector-container_active'}`}>
        <button className={`selector ${modalHidden ? '' : 'active'}`} onClick={() => setModalHidden(!modalHidden)}>
          {props.title} [{[...selected].join(', ')}]
        </button>
      </div>
      {
        !modalHidden && (
          <div className='modal-wrapper'>
            <div className='modal-back' onClick={() => setModalHidden(true)} />
            <div className='modal'>
              {/* <div className='modal-title'>{props.title}</div> */}
              <div className='modal-options-container'>
                {props.options.map(option => {
                  // @ts-expect-error
                  const value = option.value ?? option
                  // @ts-expect-error
                  const title = option.title ?? value

                  return (
                    <button
                      key={value}
                      className={['modal-option', selected.has(value) && 'active'].join(' ')}
                      onClick={() => optionHandler(value)}
                    >
                      {title}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      }
    </>
  )
}
