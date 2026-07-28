const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('../config/database');

class Server{

    constructor(){

        this.app = express();
        this.port = process.env.PORT;

        this.paths = {
            mensajes: '/api/mensajes',
            archivos: '/api/archivos',
            reservasAdmin: '/api/admin/reservas',
            reservasPublic: '/api/reservas'
        }

        this.middlewares();


        this.routes();

    }

    middlewares(){

         // CORS 
        this.app.use(cors());

        // lectura y parceo de el body
        this.app.use(express.json());

         // Direcctorio publico
         this.app.use(express.static('public'));

    }


    routes(){
        this.app.use(this.paths.mensajes, require('../routes/mensajes.route'));
        this.app.use(this.paths.archivos, require('../routes/archivos.route'));
        this.app.use(this.paths.reservasAdmin, require('../routes/reservas-admin.route'));
        this.app.use(this.paths.reservasPublic, require('../routes/reservas-public.route'));
    }

    async listen(){
        await connectDatabase();
        await new Promise((resolve, reject) => {
            const httpServer = this.app.listen(this.port, () => {
                console.log(`Servidor corriendo en el puerto ${this.port}`);
                resolve(httpServer);
            });

            httpServer.once('error', reject);
        });
    }

}

module.exports = Server;
