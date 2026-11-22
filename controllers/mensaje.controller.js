const { request, response } = require("express");
const crypto = require("crypto");
const createSMS = require("../helpers/createSMS");
const { sendMailCotizacion, sendMailEstimacion, sendMailDevisRapide, sendMailReserva } = require("../helpers/createEmail");
const { databaseIsReady } = require("../config/database");
const { getDepositInstructions } = require("../config/deposit");
const Reserva = require("../models/reserva.modelo");
const PricingRules = require("../models/pricing.modelo");
const PRICING_DEFAULTS = require("../config/pricing-defaults");
const { createContractPdf } = require("../utils/contractPdf");
const { createQuickQuotePdf } = require("../utils/quickQuotePdf");

const issueContractToken = async (reservationId) => {
    const token = crypto.randomBytes(24).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await Reserva.updateOne(
        { _id: reservationId },
        { $set: { contractAccessTokenHash: hash } }
    );
    return token;
};

 
const nuevoSMS = async (req = request, res = response) => {

    const body = req.body;

    // console.log(nom, courriel, telefono, sujec, message)

    try {

        createSMS(body).then((mensajeCreado) => {
            if (mensajeCreado) {
                // console.log(res)
                res.status(200).json({
                    ok: true,
                    message: "Mensaje enviado"
                })
            }
        })

    } catch (error) {
        res.status(200).json({
            ok: false,
            message: "Error al enviar mensaje"
        })
    }

} 

const nuevoEmailCotizacion = async (req = request, res = response) => {

    const body = req.body;

    // console.log(nom, courriel, telefono, sujec, message)

    try {

        sendMailCotizacion(body).then((emailEnviado) => {
            if (emailEnviado) {
                // console.log(res)
                res.status(200).json({
                    ok: true,
                    message: "correo enviado"
                })
            }
        })

    } catch (error) {
        res.status(200).json({
            ok: false,
            message: "Error al enviar correo"
        })
    }

}

const nuevoEmailEstimacion = async (req = request, res = response) => {

    const body = req.body;

    // console.log(nom, courriel, telefono, sujec, message)

    try {

        sendMailEstimacion(body).then((emailEnviado) => {
            if (emailEnviado) {
                // console.log(res)
                res.status(200).json({
                    ok: true,
                    message: "correo enviado"
                })
            }
        })

    } catch (error) {
        res.status(200).json({
            ok: false,
            message: "Error al enviar correo"
        })
    }

}

const nuevoDevisRapide = async (req = request, res = response) => {
    try {
        // Dépôt = 25 % du montant estimé (minimum 50 $, arrondi à 5 $).
        // Si aucun montant n'est connu (soumission express), on indique le pourcentage.
        const DEPOSIT_RATE = 0.25;
        const DEPOSIT_MIN = 50;
        // Montant reconnu seulement s'il est suivi de « $ », « CAD » ou d'un tiret (ex. « 350 - 550 $ »)
        const estimateMatch = String(req.body.estimate || "").match(/(\d[\d\s]*)(?:[.,]\d+)?\s*(?:\$|CAD|-|–)/i);
        const estimateLow = estimateMatch ? Number(estimateMatch[1].replace(/\s/g, "")) : 0;
        const depositAmount = estimateLow > 0
            ? `de ${Math.max(DEPOSIT_MIN, Math.round((estimateLow * DEPOSIT_RATE) / 5) * 5)} CAD (25 % du montant estime)`
            : `de 25 % du montant total (minimum ${DEPOSIT_MIN} CAD)`;
        const quickQuotePayload = {
            ...req.body,
            depositAmount
        };
        const quickQuotePdf = await createQuickQuotePdf(quickQuotePayload);
        const emailEnviado = await sendMailDevisRapide(quickQuotePayload, quickQuotePdf);

        if (!emailEnviado) {
            return res.status(502).json({
                ok: false,
                message: "No fue posible enviar la solicitud rapida"
            });
        }

        return res.status(200).json({
            ok: true,
            message: "Solicitud rapida enviada",
            pdf: quickQuotePdf.toString("base64"),
            pdfFilename: `devis-rapide-${String(req.body.phone).replace(/\D/g, "") || "client"}.pdf`
        });
    } catch (error) {
        console.error("Error al procesar la solicitud rapida:", error);
        return res.status(500).json({
            ok: false,
            message: "Error al procesar la solicitud rapida"
        });
    }
};

const nuevaReserva = async (req = request, res = response) => {
    if (!databaseIsReady()) {
        return res.status(503).json({
            ok: false,
            message: "La base de datos no está disponible"
        });
    }

    try {
        const depositInstructions = getDepositInstructions(
            req.body.quoteId,
            req.body.estimate.deposit
        );
        const pricingRules = await PricingRules.findOne({}).lean();
        const cancellationDeadlineHours = Number(
            pricingRules?.cancellationDeadlineHours ?? PRICING_DEFAULTS.cancellationDeadlineHours
        );
        const initialToken = crypto.randomBytes(24).toString("hex");
        const initialTokenHash = crypto.createHash("sha256").update(initialToken).digest("hex");
        let reserva;
        try {
            reserva = await Reserva.findOneAndUpdate(
                { quoteId: req.body.quoteId },
                {
                    $setOnInsert: {
                        ...req.body,
                        depositInstructions,
                        cancellationDeadlineHours,
                        contractAccessTokenHash: initialTokenHash
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
            );
        } catch (error) {
            if (error?.code !== 11000) throw error;
            reserva = await Reserva.findOne({ quoteId: req.body.quoteId });
        }

        if (reserva.emailStatus === "sent") {
            const contractToken = await issueContractToken(reserva._id);
            return res.status(200).json({
                ok: true,
                quoteId: reserva.quoteId,
                duplicate: true,
                status: reserva.status,
                depositInstructions: reserva.depositInstructions || depositInstructions,
                contractToken,
                message: "Reserva recibida anteriormente"
            });
        }

        const staleClaim = new Date(Date.now() - 10 * 60 * 1000);
        const claimed = await Reserva.findOneAndUpdate(
            {
                _id: reserva._id,
                $or: [
                    { emailStatus: { $in: ["pending", "failed"] } },
                    { emailStatus: "sending", emailClaimedAt: { $lt: staleClaim } }
                ]
            },
            {
                $set: {
                    emailStatus: "sending",
                    emailClaimedAt: new Date(),
                    emailError: null
                }
            },
            { new: true }
        );

        if (!claimed) {
            const contractToken = await issueContractToken(reserva._id);
            return res.status(202).json({
                ok: true,
                quoteId: reserva.quoteId,
                duplicate: true,
                status: reserva.status,
                depositInstructions: reserva.depositInstructions || depositInstructions,
                contractToken,
                message: "La reserva ya está siendo procesada"
            });
        }

        const contractPayload = {
            ...req.body,
            depositInstructions: reserva.depositInstructions || depositInstructions,
            cancellationDeadlineHours
        };
        const contractPdf = await createContractPdf(contractPayload);
        const emailEnviado = await sendMailReserva(contractPayload, contractPdf);

        if (!emailEnviado) {
            await Reserva.updateOne(
                { _id: reserva._id },
                {
                    $set: {
                        emailStatus: "failed",
                        emailError: "No fue posible enviar los correos de confirmación"
                    },
                    $unset: { emailClaimedAt: 1 }
                }
            );
            return res.status(502).json({
                ok: false,
                message: "No fue posible enviar la reserva. Intente nuevamente."
            });
        }

        await Reserva.updateOne(
            { _id: reserva._id },
            {
                $set: {
                    emailStatus: "sent",
                    emailSentAt: new Date(),
                    emailError: null
                },
                $unset: { emailClaimedAt: 1 }
            }
        );

        const contractToken = await issueContractToken(reserva._id);
        return res.status(201).json({
            ok: true,
            quoteId: req.body.quoteId,
            status: "awaiting_deposit",
            depositInstructions: contractPayload.depositInstructions,
            contractToken,
            message: "Solicitud recibida. Depósito pendiente."
        });
    } catch (error) {
        console.error("Error al procesar la reserva:", error);
        return res.status(500).json({
            ok: false,
            message: "Error al procesar la reserva"
        });
    }
};

module.exports = {
    nuevoSMS,
    nuevoEmailCotizacion,
    nuevoEmailEstimacion,
    nuevoDevisRapide,
    nuevaReserva
}
