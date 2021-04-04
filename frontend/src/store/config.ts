export const SPACES_URL: string | undefined = process.env.REACT_APP_SPACES_URL;
// start it like this `REACT_APP_SOCKET_URL=ws://localhost:6503` yarn run start
export const SOCKET_URL: string | undefined = process.env.REACT_APP_SIGNAL_URL;
export const SOCKET_PORT: string | undefined = process.env.REACT_APP_SIGNAL_PORT;
export const AUTH_SERVICE: string | undefined = process.env.REACT_APP_AUTH_URL

export const rtcConfiguration = {
    "iceServers": [{
        "urls": [
                "stun:stun.alphabibber.com:3478"
        //     "stun:iphone-stun.strato-iphone.de:3478",
        //     "stun:numb.viagenie.ca:3478",
        //     "stun:s1.taraba.net:3478",
        //     "stun:s2.taraba.net:3478",
        //     "stun:stun.12connect.com:3478",
        //     "stun:stun.12voip.com:3478",
        //     "stun:stun.1und1.de:3478",
        //     "stun:stun.2talk.co.nz:3478",
        //     "stun:stun.2talk.com:3478",
        //     "stun:stun.3clogic.com:3478",
        //     "stun:stun.3cx.com:3478",
        //     "stun:stun.a-mm.tv:3478",
        //     "stun:stun.aa.net.uk:3478",
        //     "stun:stun.acrobits.cz:3478",
        //     "stun:stun.actionvoip.com:3478",
        //     "stun:stun.advfn.com:3478",
        //     "stun:stun.aeta-audio.com:3478",
        //     "stun:stun.aeta.com:3478",
        //     "stun:stun.alltel.com.au:3478",
        //     "stun:stun.altar.com.pl:3478",
        //     "stun:stun.annatel.net:3478",
        //     "stun:stun.antisip.com:3478",
        //     "stun:stun.arbuz.ru:3478",
        //     "stun:stun.avigora.com:3478",
        //     "stun:stun.avigora.fr:3478",
        //     "stun:stun.awa-shima.com:3478",
        //     "stun:stun.awt.be:3478",
        //     "stun:stun.b2b2c.ca:3478",
        //     "stun:stun.bahnhof.net:3478",
        //     "stun:stun.barracuda.com:3478",
        //     "stun:stun.bluesip.net:3478",
        //     "stun:stun.bmwgs.cz:3478",
        //     "stun:stun.botonakis.com:3478",
        //     "stun:stun.budgetphone.nl:3478",
        //     "stun:stun.budgetsip.com:3478",
        //     "stun:stun.cablenet-as.net:3478",
        //     "stun:stun.callromania.ro:3478",
        //     "stun:stun.callwithus.com:3478",
        //     "stun:stun.cbsys.net:3478",
        //     "stun:stun.chathelp.ru:3478",
        //     "stun:stun.cheapvoip.com:3478",
        //     "stun:stun.ciktel.com:3478",
        //     "stun:stun.cloopen.com:3478",
        //     "stun:stun.colouredlines.com.au:3478",
        //     "stun:stun.comfi.com:3478",
        //     "stun:stun.commpeak.com:3478",
        //     "stun:stun.comtube.com:3478",
        //     "stun:stun.comtube.ru:3478",
        //     "stun:stun.cope.es:3478",
        //     "stun:stun.counterpath.com:3478",
        //     "stun:stun.counterpath.net:3478",
        //     "stun:stun.cryptonit.net:3478",
        //     "stun:stun.darioflaccovio.it:3478",
        //     "stun:stun.datamanagement.it:3478",
        //     "stun:stun.dcalling.de:3478",
        //     "stun:stun.decanet.fr:3478",
        //     "stun:stun.demos.ru:3478",
        //     "stun:stun.develz.org:3478",
        //     "stun:stun.dingaling.ca:3478",
        //     "stun:stun.doublerobotics.com:3478",
        //     "stun:stun.drogon.net:3478",
        //     "stun:stun.duocom.es:3478",
        //     "stun:stun.dus.net:3478",
        //     "stun:stun.e-fon.ch:3478",
        //     "stun:stun.easybell.de:3478",
        //     "stun:stun.easycall.pl:3478",
        //     "stun:stun.easyvoip.com:3478",
        //     "stun:stun.efficace-factory.com:3478",
        //     "stun:stun.einsundeins.com:3478",
        //     "stun:stun.einsundeins.de:3478",
        //     "stun:stun.ekiga.net:3478",
        //     "stun:stun.epygi.com:3478",
        //     "stun:stun.etoilediese.fr:3478",
        //     "stun:stun.eyeball.com:3478",
        //     "stun:stun.faktortel.com.au:3478",
        //     "stun:stun.freecall.com:3478",
        //     "stun:stun.freeswitch.org:3478",
        //     "stun:stun.freevoipdeal.com:3478",
        //     "stun:stun.fuzemeeting.com:3478",
        //     "stun:stun.gmx.de:3478",
        //     "stun:stun.gmx.net:3478",
        //     "stun:stun.gradwell.com:3478",
        //     "stun:stun.halonet.pl:3478",
        //     "stun:stun.hellonanu.com:3478",
        //     "stun:stun.hoiio.com:3478",
        //     "stun:stun.hosteurope.de:3478",
        //     "stun:stun.ideasip.com:3478",
        //     "stun:stun.imesh.com:3478",
        //     "stun:stun.infra.net:3478",
        //     "stun:stun.internetcalls.com:3478",
        //     "stun:stun.intervoip.com:3478",
        //     "stun:stun.ipcomms.net:3478",
        //     "stun:stun.ipfire.org:3478",
        //     "stun:stun.ippi.fr:3478",
        //     "stun:stun.ipshka.com:3478",
        //     "stun:stun.iptel.org:3478",
        //     "stun:stun.irian.at:3478",
        //     "stun:stun.it1.hr:3478",
        //     "stun:stun.ivao.aero:3478",
        //     "stun:stun.jappix.com:3478",
        //     "stun:stun.jumblo.com:3478",
        //     "stun:stun.justvoip.com:3478",
        //     "stun:stun.kanet.ru:3478",
        //     "stun:stun.kiwilink.co.nz:3478",
        //     "stun:stun.kundenserver.de:3478",
        //     "stun:stun.l.google.com:19302",
        //     "stun:stun.linea7.net:3478",
        //     "stun:stun.linphone.org:3478",
        //     "stun:stun.liveo.fr:3478",
        //     "stun:stun.lowratevoip.com:3478",
        //     "stun:stun.lugosoft.com:3478",
        //     "stun:stun.lundimatin.fr:3478",
        //     "stun:stun.magnet.ie:3478",
        //     "stun:stun.manle.com:3478",
        //     "stun:stun.mgn.ru:3478",
        //     "stun:stun.mit.de:3478",
        //     "stun:stun.mitake.com.tw:3478",
        //     "stun:stun.miwifi.com:3478",
        //     "stun:stun.modulus.gr:3478",
        //     "stun:stun.mozcom.com:3478",
        //     "stun:stun.myvoiptraffic.com:3478",
        //     "stun:stun.mywatson.it:3478",
        //     "stun:stun.nas.net:3478",
        //     "stun:stun.neotel.co.za:3478",
        //     "stun:stun.netappel.com:3478",
        //     "stun:stun.netappel.fr:3478",
        //     "stun:stun.netgsm.com.tr:3478",
        //     "stun:stun.nfon.net:3478",
        //     "stun:stun.noblogs.org:3478",
        //     "stun:stun.noc.ams-ix.net:3478",
        //     "stun:stun.node4.co.uk:3478",
        //     "stun:stun.nonoh.net:3478",
        //     "stun:stun.nottingham.ac.uk:3478",
        //     "stun:stun.nova.is:3478",
        //     "stun:stun.nventure.com:3478",
        //     "stun:stun.on.net.mk:3478",
        //     "stun:stun.ooma.com:3478",
        //     "stun:stun.ooonet.ru:3478",
        //     "stun:stun.oriontelekom.rs:3478",
        //     "stun:stun.outland-net.de:3478",
        //     "stun:stun.ozekiphone.com:3478",
        //     "stun:stun.patlive.com:3478",
        //     "stun:stun.personal-voip.de:3478",
        //     "stun:stun.petcube.com:3478",
        //     "stun:stun.phone.com:3478",
        //     "stun:stun.phoneserve.com:3478",
        //     "stun:stun.pjsip.org:3478",
        //     "stun:stun.poivy.com:3478",
        //     "stun:stun.powerpbx.org:3478",
        //     "stun:stun.powervoip.com:3478",
        //     "stun:stun.ppdi.com:3478",
        //     "stun:stun.prizee.com:3478",
        //     "stun:stun.qq.com:3478",
        //     "stun:stun.qvod.com:3478",
        //     "stun:stun.rackco.com:3478",
        //     "stun:stun.rapidnet.de:3478",
        //     "stun:stun.rb-net.com:3478",
        //     "stun:stun.refint.net:3478",
        //     "stun:stun.remote-learner.net:3478",
        //     "stun:stun.rixtelecom.se:3478",
        //     "stun:stun.rockenstein.de:3478",
        //     "stun:stun.rolmail.net:3478",
        //     "stun:stun.rounds.com:3478",
        //     "stun:stun.rynga.com:3478",
        //     "stun:stun.samsungsmartcam.com:3478",
        //     "stun:stun.schlund.de:3478",
        //     "stun:stun.services.mozilla.com:3478",
        //     "stun:stun.sigmavoip.com:3478",
        //     "stun:stun.sip.us:3478",
        //     "stun:stun.sipdiscount.com:3478",
        //     "stun:stun.sipgate.net:10000",
        //     "stun:stun.sipgate.net:3478",
        //     "stun:stun.siplogin.de:3478",
        //     "stun:stun.sipnet.net:3478",
        //     "stun:stun.sipnet.ru:3478",
        //     "stun:stun.siportal.it:3478",
        //     "stun:stun.sippeer.dk:3478",
        //     "stun:stun.siptraffic.com:3478",
        //     "stun:stun.skylink.ru:3478",
        //     "stun:stun.sma.de:3478",
        //     "stun:stun.smartvoip.com:3478",
        //     "stun:stun.smsdiscount.com:3478",
        //     "stun:stun.snafu.de:3478",
        //     "stun:stun.softjoys.com:3478",
        //     "stun:stun.solcon.nl:3478",
        //     "stun:stun.solnet.ch:3478",
        //     "stun:stun.sonetel.com:3478",
        //     "stun:stun.sonetel.net:3478",
        //     "stun:stun.sovtest.ru:3478",
        //     "stun:stun.speedy.com.ar:3478",
        //     "stun:stun.spokn.com:3478",
        //     "stun:stun.srce.hr:3478",
        //     "stun:stun.ssl7.net:3478",
        //     "stun:stun.stunprotocol.org:3478",
        //     "stun:stun.symform.com:3478",
        //     "stun:stun.symplicity.com:3478",
        //     "stun:stun.sysadminman.net:3478",
        //     "stun:stun.t-online.de:3478",
        //     "stun:stun.tagan.ru:3478",
        //     "stun:stun.tatneft.ru:3478",
        //     "stun:stun.teachercreated.com:3478",
        //     "stun:stun.tel.lu:3478",
        //     "stun:stun.telbo.com:3478",
        //     "stun:stun.telefacil.com:3478",
        //     "stun:stun.tis-dialog.ru:3478",
        //     "stun:stun.tng.de:3478",
        //     "stun:stun.twt.it:3478",
        //     "stun:stun.u-blox.com:3478",
        //     "stun:stun.ucallweconn.net:3478",
        //     "stun:stun.ucsb.edu:3478",
        //     "stun:stun.ucw.cz:3478",
        //     "stun:stun.uls.co.za:3478",
        //     "stun:stun.unseen.is:3478",
        //     "stun:stun.usfamily.net:3478",
        //     "stun:stun.veoh.com:3478",
        //     "stun:stun.vidyo.com:3478",
        //     "stun:stun.vipgroup.net:3478",
        //     "stun:stun.virtual-call.com:3478",
        //     "stun:stun.viva.gr:3478",
        //     "stun:stun.vivox.com:3478",
        //     "stun:stun.vline.com:3478",
        //     "stun:stun.vo.lu:3478",
        //     "stun:stun.vodafone.ro:3478",
        //     "stun:stun.voicetrading.com:3478",
        //     "stun:stun.voip.aebc.com:3478",
        //     "stun:stun.voip.blackberry.com:3478",
        //     "stun:stun.voip.eutelia.it:3478",
        //     "stun:stun.voiparound.com:3478",
        //     "stun:stun.voipblast.com:3478",
        //     "stun:stun.voipbuster.com:3478",
        //     "stun:stun.voipbusterpro.com:3478",
        //     "stun:stun.voipcheap.co.uk:3478",
        //     "stun:stun.voipcheap.com:3478",
        //     "stun:stun.voipfibre.com:3478",
        //     "stun:stun.voipgain.com:3478",
        //     "stun:stun.voipgate.com:3478",
        //     "stun:stun.voipinfocenter.com:3478",
        //     "stun:stun.voipplanet.nl:3478",
        //     "stun:stun.voippro.com:3478",
        //     "stun:stun.voipraider.com:3478",
        //     "stun:stun.voipstunt.com:3478",
        //     "stun:stun.voipwise.com:3478",
        //     "stun:stun.voipzoom.com:3478",
        //     "stun:stun.vopium.com:3478",
        //     "stun:stun.voxgratia.org:3478",
        //     "stun:stun.voxox.com:3478",
        //     "stun:stun.voys.nl:3478",
        //     "stun:stun.voztele.com:3478",
        //     "stun:stun.vyke.com:3478",
        //     "stun:stun.webcalldirect.com:3478",
        //     "stun:stun.whoi.edu:3478",
        //     "stun:stun.wifirst.net:3478",
        //     "stun:stun.wwdl.net:3478",
        //     "stun:stun.xs4all.nl:3478",
        //     "stun:stun.xtratelecom.es:3478",
        //     "stun:stun.yesss.at:3478",
        //     "stun:stun.zadarma.com:3478",
        //     "stun:stun.zadv.com:3478",
        //     "stun:stun.zoiper.com:3478",
        //     "stun:stun1.faktortel.com.au:3478",
        //     "stun:stun1.l.google.com:19302",
        //     "stun:stun1.voiceeclipse.net:3478",
        //     "stun:stun2.l.google.com:19302",
        //     "stun:stun3.l.google.com:19302",
        //     "stun:stun4.l.google.com:19302",
        //     "stun:stunserver.org:3478"
        ]
    }]
}
