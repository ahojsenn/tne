export default defineEventHandler(() => {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!id) return { url: null }
  return { url: `https://docs.google.com/spreadsheets/d/${id}` }
})
