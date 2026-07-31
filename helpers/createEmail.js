const postmarkTransport = require('nodemailer-postmark-transport');
const nodemailer = require('nodemailer');

const { crearHtmlParaCorreoCotizacion, crearHtmlParaCorreoEstimacion } = require('../utils/templates');
const { crearHtmlReservaInterna, crearHtmlConfirmacionCliente } = require('../utils/reservationTemplates');


const sendMailCotizacion = async (body) => {

  console.log('Enviando mensaje por correo');

  const { nom, courriel, telefono, sujec, message } = body;

  try {

    const transport = nodemailer.createTransport(
      postmarkTransport({
        auth: {
          apiKey: process.env.POSTMARKKEY // Reemplaza 'tu_api_key' con tu API key de Postmark
        }
      })
    );

    const info = await transport.sendMail({
      from: 'demenagement@transportdoublez.com', // sender address
      to: 'demenagement@transportdoublez.com', // list of receivers array
      subject: nom + ' a solicitado sus servicios!!', // Subject line
      text: sujec, // plain text body
      html: crearHtmlParaCorreoCotizacion(nom, message, courriel, telefono) // html body
    });

    console.log("Message sent: %s", info.messageId);

    return true

  } catch (error) {

    console.error('Error al enviar mensajae por correo:', error);
    return false; // Retorna false indicando que hubo un error al enviar el mensaje
  }

}

const sendMailEstimacion = async (body) => {

  console.log('Enviando mensaje por correo');

  const { date, name, tel, cell, email, street, city, postalCode, province, numRooms, floor, elevator, refrigerator,
    stove, washer, dryer, dishwasher, divanTwoPlace, divanthreePlace, bureau, table, lit, armoire, others, numberBoxes,
    comments, streetNumber, would, codePostal, provinceArrival, numberPieces, floorArrival, elevatorArrival } = body;

  try {

    const transport = nodemailer.createTransport(
      postmarkTransport({
        auth: {
          apiKey: process.env.POSTMARKKEY // Reemplaza 'tu_api_key' con tu API key de Postmark
        }
      })
    );

    const info = await transport.sendMail({
      from: 'demenagement@transportdoublez.com', // sender address
      to: 'demenagement@transportdoublez.com', // list of receivers array
      subject: name + ' a solicitado sus servicios!!', // Subject line
      text: email, // plain text body
      html: crearHtmlParaCorreoEstimacion(date, name, tel, cell, email, street, city, postalCode, province, numRooms, floor, elevator, refrigerator,
        stove, washer, dryer, dishwasher, divanTwoPlace, divanthreePlace, bureau, table, lit, armoire, others, numberBoxes,
        comments, streetNumber, would, codePostal, provinceArrival, numberPieces, floorArrival, elevatorArrival) // html body
    });

    console.log("Message sent: %s", info.messageId);

    return true

  } catch (error) {

    console.error('Error al enviar mensajae por correo:', error);
    return false; // Retorna false indicando que hubo un error al enviar el mensaje
  }

}

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendMailDevisRapide = async (body, quickQuotePdf) => {
  console.log('Enviando devis rapide por correo');

  const {
    origin,
    destination,
    housing,
    rooms,
    access,
    date,
    phone,
    estimate
  } = body;

  try {
    const transport = nodemailer.createTransport(
      postmarkTransport({
        auth: {
          apiKey: process.env.POSTMARKKEY
        }
      })
    );

    const rows = [
      ['Depart', origin],
      ['Arrivee', destination],
      ['Logement', housing],
      ['Pieces', rooms],
      ['Acces', access],
      ['Date souhaitee', date],
      ['Telephone', phone],
      ['Estimation indicative', estimate]
    ];

    const htmlRows = rows.map(([label, value]) => `
      <tr>
        <td style="padding:8px 12px;color:#606775;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</td>
        <td style="padding:8px 12px;font-weight:700;border-bottom:1px solid #e5e7eb">${escapeHtml(value || '-')}</td>
      </tr>
    `).join('');

    const info = await transport.sendMail({
      from: 'demenagement@transportdoublez.com',
      to: process.env.RESERVATION_EMAIL || 'demenagement@transportdoublez.com',
      subject: `Devis rapide - ${phone}`,
      text: `Devis rapide: ${phone} | ${origin || '-'} -> ${destination || '-'} | ${date || '-'}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#111827;max-width:640px;margin:auto">
          <h1 style="margin:0 0 12px;color:#dc2626">Nouvelle demande rapide</h1>
          <p style="margin:0 0 18px;color:#4b5563">Un client a rempli le formulaire de devis en 60 secondes.</p>
          <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb">
            ${htmlRows}
          </table>
        </div>
      `,
      attachments: quickQuotePdf ? [{
        filename: `devis-rapide-${phone.replace(/\D/g, '') || 'client'}.pdf`,
        content: quickQuotePdf,
        contentType: 'application/pdf'
      }] : []
    });

    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar devis rapide por correo:', error);
    return false;
  }
};

const sendMailReserva = async (body, contractPdf) => {
  const transport = nodemailer.createTransport(
    postmarkTransport({
      auth: {
        apiKey: process.env.POSTMARKKEY
      }
    })
  );
  const from = 'demenagement@transportdoublez.com';
  const reservationEmail = process.env.RESERVATION_EMAIL || from;
  const clientName = `${body.contact.firstName} ${body.contact.lastName}`;

  try {
    await Promise.all([
      transport.sendMail({
        from,
        to: reservationEmail,
        subject: `${body.quoteId} · Nouvelle demande de ${clientName}`,
        text: `Nouvelle demande ${body.quoteId} de ${clientName}`,
        html: crearHtmlReservaInterna(body),
        attachments: [{
          filename: `contrat-${body.quoteId}.pdf`,
          content: contractPdf,
          contentType: 'application/pdf'
        }]
      }),
      transport.sendMail({
        from,
        to: body.contact.email,
        subject: `${body.quoteId} · Groupe Double Z`,
        text: `Votre demande ${body.quoteId} a été reçue.`,
        html: crearHtmlConfirmacionCliente(body),
        attachments: [{
          filename: `contrat-${body.quoteId}.pdf`,
          content: contractPdf,
          contentType: 'application/pdf'
        }]
      })
    ]);
    return true;
  } catch (error) {
    console.error('Error al enviar la reserva por correo:', error);
    return false;
  }
};

module.exports = {
  sendMailCotizacion,
  sendMailEstimacion,
  sendMailDevisRapide,
  sendMailReserva
}
