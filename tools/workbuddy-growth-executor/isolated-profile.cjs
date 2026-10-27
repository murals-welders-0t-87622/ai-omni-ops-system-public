const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function inside(parent,child){const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
function noLinks(target){let p=path.resolve(target);for(;;){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error('PROFILE_LINK_NOT_ALLOWED');const next=path.dirname(p);if(next===p)break;p=next;}}
function prepareIsolatedProfile({privateRoot,brandId,connectionId}){
 if(!path.isAbsolute(privateRoot)||!/^[a-zA-Z0-9_-]{1,128}$/.test(brandId)||!/^conn_[a-zA-Z0-9_-]{1,128}$/.test(connectionId))throw Error('PROFILE_SCOPE_REQUIRED');
 const root=path.resolve(privateRoot);if(inside(path.join(os.homedir(),'.workbuddy'),root))throw Error('SHARED_DESKTOP_PROFILE_NOT_ALLOWED');
 const profileRoot=path.join(root,'brands',brandId,connectionId);noLinks(profileRoot);const file=path.join(profileRoot,'profile.json');
 if(fs.existsSync(file)){const prior=JSON.parse(fs.readFileSync(file,'utf8'));if(prior.brandId!==brandId||prior.connectionId!==connectionId)throw Error('PROFILE_OWNER_MISMATCH');return prior;}
 const directories={runtimeDir:path.join(profileRoot,'state'),workspaceDir:path.join(profileRoot,'workspace'),workbuddyConfigDir:path.join(profileRoot,'workbuddy'),logsDir:path.join(profileRoot,'logs')};
 for(const p of Object.values(directories))fs.mkdirSync(p,{recursive:true,mode:0o700});
 const manifest={version:'1.0.0',brandId,connectionId,profileRoot,...directories,state:'awaiting_client_authorization',automaticExecutionEnabled:false};
 fs.writeFileSync(file,JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});return manifest;
}
function validateIsolatedProfile(c){
 if(!c.connectionId)throw Error('PROFILE_CONNECTION_REQUIRED');const file=path.join(c.profileRoot||'','profile.json');noLinks(file);const p=JSON.parse(fs.readFileSync(file,'utf8'));
 if(p.brandId!==c.brandId||p.connectionId!==c.connectionId||path.resolve(p.profileRoot)!==path.resolve(c.profileRoot))throw Error('PROFILE_OWNER_MISMATCH');
 for(const key of ['runtimeDir','workspaceDir','workbuddyConfigDir']){if(!c[key]||path.resolve(c[key])!==path.resolve(p[key])||!inside(c.profileRoot,c[key]))throw Error('PROFILE_DIRECTORY_MISMATCH');noLinks(c[key]);}
 if(inside(path.join(os.homedir(),'.workbuddy'),c.workbuddyConfigDir)||path.resolve(c.workbuddyConfigDir)===path.resolve(os.homedir(),'.workbuddy'))throw Error('SHARED_DESKTOP_PROFILE_NOT_ALLOWED');
 return p;
}
module.exports={prepareIsolatedProfile,validateIsolatedProfile};
