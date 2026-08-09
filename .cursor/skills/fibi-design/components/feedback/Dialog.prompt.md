Modal or bottom sheet.

```jsx
<Dialog open={o} onClose={close} variant="sheet" title="Save to collection" footer={<Button>Save</Button>} />
```

Use `sheet` on mobile, `center` on desktop. Scrim is indigo at 48%, always with a light blur.
