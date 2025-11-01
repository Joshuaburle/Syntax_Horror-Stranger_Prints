# Downloads

Place the Windows executable payload here as `JeanMichel` (no extension).

- The landing page `jeanmichel.html` links to `downloads/JeanMichel` and uses `download="JeanMichel.exe"` so browsers save it as a .exe automatically.
- Replace the placeholder with your actual binary when ready. Keep the filename exactly `JeanMichel` (or update the link/attribute in `jeanmichel.html`).
- If you change the payload, also update the displayed checksum on the page. You can run:
	- PowerShell: `tools\update-download.ps1 C:\path\to\your\JeanMichel`
	- WSL/Bash: `./tools/update-download.sh /path/to/JeanMichel`
	These scripts copy the file here and refresh the MD5 shown on the page.
