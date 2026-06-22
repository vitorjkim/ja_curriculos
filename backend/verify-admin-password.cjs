const bcrypt = require('bcryptjs');
const hash = '$2a$10$VMFZmE843FQ5iEptIXYa8.geBAe1TzTLCRwGsVdZzFHVf..E5nhru';
(async ()=>{
  for (const pwd of ['admin123','admin','123456','senha123','Administrador']){
    const ok = await bcrypt.compare(pwd, hash);
    console.log(pwd,'=>', ok);
  }
})();
