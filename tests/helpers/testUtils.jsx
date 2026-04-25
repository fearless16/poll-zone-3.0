import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { RoomDataContextProvider, RoomDataContext } from '../../src/Context/useRoomData'

export function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

export function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <RoomDataContextProvider>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationDisplay />
      </MemoryRouter>
    </RoomDataContextProvider>
  )
}

export function renderWithContext(ui, contextValue, { route = '/' } = {}) {
  return render(
    <RoomDataContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
        <LocationDisplay />
      </MemoryRouter>
    </RoomDataContext.Provider>
  )
}
