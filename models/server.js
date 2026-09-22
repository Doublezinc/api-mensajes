const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDatabase } = require('../config/database');

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'https://transportdoublez.com',
    'https://www.transportdoublez.com'
];

const getAllowedOrigins = () => {
    const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
};

class Server{

    constructor(){

        this.app = express();
        this.port = process.env.PORT;

        this.paths = {
            mensajes: '/api/mensajes',
            archivos: '/api/archivos',
            reservasAdmin: '/api/admin/reservas',
            reservasPublic: '/api/reservas',
            pricingPublic: '/api/pricing',
            pricingAdmin: '/api/admin/pricing',
            petitsTransports: '/api/petits-transports',
            petitsTransportsAdmin: '/api/admin/petits-transports'
        }

        this.middlewares();


        this.routes();

        this.errorHandler();

    }

    middlewares(){

        // CORS restringido a orígenes permitidos (CORS_ALLOWED_ORIGINS en .env, separados por coma)
        const allowedOrigins = getAllowedOrigins();
        this.app.use(cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Origen no permitido por CORS'));
            }
        }));

        // Límite de solicitudes para los endpoints públicos
        const publicApiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 60,
            standardHeaders: true,
            legacyHeaders: false,
            message: { ok: false, message: 'Demasiadas solicitudes. Intente de nuevo más tarde.' }
        });
        this.app.use(['/api/mensajes', '/api/reservas', '/api/pricing', '/api/petits-transports'], publicApiLimiter);

        // Límite de solicitudes para el panel administrativo (protege la clave contra fuerza bruta)
        const adminApiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 100,
            standardHeaders: true,
            legacyHeaders: false,
            message: { ok: false, message: 'Demasiadas solicitudes. Intente de nuevo más tarde.' }
        });
        this.app.use(['/api/admin/reservas', '/api/admin/pricing', '/api/admin/petits-transports'], adminApiLimiter);

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
        this.app.use(this.paths.pricingPublic, require('../routes/pricing.route'));
        this.app.use(this.paths.pricingAdmin, require('../routes/pricing-admin.route'));
        this.app.use(this.paths.petitsTransports, require('../routes/petits-transports.route'));
        this.app.use(this.paths.petitsTransportsAdmin, require('../routes/petits-transports-admin.route'));
    }

    errorHandler(){
        this.app.use((error, req, res, next) => {
            if (error && error.message === 'Origen no permitido por CORS') {
                return res.status(403).json({ ok: false, message: 'Origen no permitido' });
            }
            return next(error);
        });
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
