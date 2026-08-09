Map canvas; absolutely-position `PinMarker`s as children.

```jsx
<MapSurface center={[38.7223,-9.1393]} zoom={13} style={{height:420}}>
  <PinMarker tone="saved" style={{position:"absolute",left:"40%",top:"52%"}} />
</MapSurface>
```
