# 1. Update AppContext.jsx to export setMachineReadings
with open('src/context/AppContext.jsx', 'r', encoding='utf-8') as f:
    app_context = f.read()

app_context = app_context.replace(
    "machineReadings, addMachineReading, deleteMachineReading,",
    "machineReadings, setMachineReadings, addMachineReading, deleteMachineReading,"
)

with open('src/context/AppContext.jsx', 'w', encoding='utf-8') as f:
    f.write(app_context)

print("AppContext.jsx updated with setMachineReadings export.")

# 2. Defensive updates in App.jsx for handleDownloadAll
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app_jsx = f.read()

old_download_block = """      if (data.records && data.records.length > 0) {
        setRecords(data.records);
      }
      if (data.companies && data.companies.length > 0) {
        setCompanies(data.companies);
      }
      if (data.services && data.services.length > 0) {
        setServices(data.services);
      }
      if (data.machineReadings && data.machineReadings.length > 0) {
        setMachineReadings(data.machineReadings);
      }"""

new_download_block = """      if (data.records && typeof setRecords === 'function') {
        setRecords(data.records);
      }
      if (data.companies && typeof setCompanies === 'function') {
        setCompanies(data.companies);
      }
      if (data.services && typeof setServices === 'function') {
        setServices(data.services);
      }
      if (data.machineReadings && typeof setMachineReadings === 'function') {
        setMachineReadings(data.machineReadings);
      }"""

app_jsx = app_jsx.replace(old_download_block, new_download_block)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_jsx)

print("App.jsx updated defensively.")
