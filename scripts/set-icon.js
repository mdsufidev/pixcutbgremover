const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'win32') return;

  const appOutDir = context.appOutDir;
  const exeName = (context.packager && context.packager.appInfo && context.packager.appInfo.productFilename)
    ? `${context.packager.appInfo.productFilename}.exe`
    : 'PixCutBg Desktop.exe';

  const exePath = path.join(appOutDir, exeName);
  const iconPath = path.join(__dirname, '../resources/icons/icon.ico');

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) {
    console.log('[set-icon] Target exe or icon not found at:', exePath);
    return;
  }

  console.log('[set-icon] Injecting official PixCut icon into:', exePath);
  try {
    const exeBuffer = fs.readFileSync(exePath);
    const exe = ResEdit.NtExecutable.from(exeBuffer);
    const res = ResEdit.NtExecutableResource.from(exe);
    const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));

    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
      res.entries,
      1,
      1033,
      iconFile.icons.map((item) => item.data)
    );

    res.outputResource(exe);
    fs.writeFileSync(exePath, Buffer.from(exe.generate()));
    console.log('[set-icon] Successfully injected official PixCut icon into', exeName);
  } catch (err) {
    console.error('[set-icon] Error injecting icon:', err);
  }
};
