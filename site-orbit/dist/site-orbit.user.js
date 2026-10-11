// ==UserScript==
// @name         SiteOrbit
// @namespace    https://github.com/quantavil/userscript/
// @version      1.1.0
// @author       quantavil
// @description  Private Domain & Tech Observatory caching verified Tranco global ranks, tech stack, DNS infrastructure, and live performance metrics.
// @license      GPL-3.0-or-later
// @match        http://*/*
// @match        https://*/*
// @connect      tranco-list.eu
// @connect      cloudflare-dns.com
// @grant        GM_deleteValue
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var PUBLIC_SUFFIXES = new Set([
		"!city.kawasaki.jp",
		"!city.kitakyushu.jp",
		"!city.kobe.jp",
		"!city.nagoya.jp",
		"!city.sapporo.jp",
		"!city.sendai.jp",
		"!city.yokohama.jp",
		"!www.ck",
		"0.bg",
		"1.bg",
		"2.bg",
		"2000.hu",
		"3.bg",
		"4.bg",
		"5.bg",
		"5g.in",
		"6.bg",
		"6g.in",
		"7.bg",
		"8.bg",
		"9.bg",
		"9guacu.br",
		"a.bg",
		"a.se",
		"aa.no",
		"aaa.pro",
		"aarborte.no",
		"ab.ca",
		"abashiri.hokkaido.jp",
		"abc.br",
		"abeno.osaka.jp",
		"abg.ec",
		"abiko.chiba.jp",
		"abira.hokkaido.jp",
		"abo.pa",
		"abr.it",
		"abruzzo.it",
		"abu.yamaguchi.jp",
		"ac.ae",
		"ac.at",
		"ac.bd",
		"ac.be",
		"ac.bw",
		"ac.ci",
		"ac.cn",
		"ac.cr",
		"ac.cy",
		"ac.eg",
		"ac.fj",
		"ac.gn",
		"ac.gov.br",
		"ac.id",
		"ac.il",
		"ac.im",
		"ac.in",
		"ac.ir",
		"ac.jp",
		"ac.ke",
		"ac.kr",
		"ac.lk",
		"ac.ls",
		"ac.ma",
		"ac.me",
		"ac.ml",
		"ac.mu",
		"ac.mw",
		"ac.mz",
		"ac.ni",
		"ac.nz",
		"ac.pa",
		"ac.pk",
		"ac.pr",
		"ac.rs",
		"ac.rw",
		"ac.se",
		"ac.sz",
		"ac.th",
		"ac.tz",
		"ac.ug",
		"ac.uk",
		"ac.vn",
		"ac.za",
		"ac.zm",
		"ac.zw",
		"aca.pro",
		"academia.bo",
		"accident-investigation.aero",
		"accident-prevention.aero",
		"acct.pro",
		"achi.nagano.jp",
		"act.au",
		"act.edu.au",
		"ad.jp",
		"adachi.tokyo.jp",
		"adm.br",
		"adm.ec",
		"adult.ht",
		"adv.br",
		"adv.mz",
		"aejrie.no",
		"aero.in",
		"aero.mv",
		"aerobatic.aero",
		"aeroclub.aero",
		"aerodrome.aero",
		"afjord.no",
		"africa.bj",
		"ag.it",
		"aga.niigata.jp",
		"agano.niigata.jp",
		"agdenes.no",
		"agematsu.nagano.jp",
		"agents.aero",
		"agr.br",
		"agrar.hu",
		"agri.jo",
		"agric.za",
		"agrigento.it",
		"agro.bj",
		"agro.bo",
		"agro.pl",
		"agron.ec",
		"aguni.okinawa.jp",
		"ah.cn",
		"ah.no",
		"ai.bd",
		"ai.id",
		"ai.in",
		"ai.jo",
		"ai.kr",
		"ai.vn",
		"aibetsu.hokkaido.jp",
		"aichi.jp",
		"aid.pl",
		"aikawa.kanagawa.jp",
		"ainan.ehime.jp",
		"aioi.hyogo.jp",
		"aip.ee",
		"air-surveillance.aero",
		"air-traffic-control.aero",
		"aircraft.aero",
		"airline.aero",
		"airport.aero",
		"airtraffic.aero",
		"aisai.aichi.jp",
		"aisho.shiga.jp",
		"aizubange.fukushima.jp",
		"aizumi.tokushima.jp",
		"aizumisato.fukushima.jp",
		"aizuwakamatsu.fukushima.jp",
		"aju.br",
		"ak.us",
		"akabira.hokkaido.jp",
		"akagi.shimane.jp",
		"akaiwa.okayama.jp",
		"akashi.hyogo.jp",
		"aki.kochi.jp",
		"akiruno.tokyo.jp",
		"akishima.tokyo.jp",
		"akita.akita.jp",
		"akita.jp",
		"akkeshi.hokkaido.jp",
		"aknoluokta.no",
		"ako.hyogo.jp",
		"akrehamn.no",
		"akune.kagoshima.jp",
		"al.gov.br",
		"al.it",
		"al.no",
		"al.us",
		"alaheadju.no",
		"aland.fi",
		"alessandria.it",
		"alesund.no",
		"algard.no",
		"alstahaug.no",
		"alt.na",
		"alt.za",
		"alta.no",
		"alto-adige.it",
		"altoadige.it",
		"alumni.in",
		"alvdal.no",
		"am.br",
		"am.gov.br",
		"am.in",
		"ama.aichi.jp",
		"ama.shimane.jp",
		"amagasaki.hyogo.jp",
		"amakusa.kumamoto.jp",
		"amami.kagoshima.jp",
		"ambulance.aero",
		"ami.ibaraki.jp",
		"amli.no",
		"amot.no",
		"an.it",
		"anamizu.ishikawa.jp",
		"anan.nagano.jp",
		"anan.tokushima.jp",
		"anani.br",
		"ancona.it",
		"andasuolo.no",
		"andebu.no",
		"ando.nara.jp",
		"andoy.no",
		"andria-barletta-trani.it",
		"andria-trani-barletta.it",
		"andriabarlettatrani.it",
		"andriatranibarletta.it",
		"andøy.no",
		"angiang.vn",
		"anjo.aichi.jp",
		"ann-arbor.mi.us",
		"annaka.gunma.jp",
		"anpachi.gifu.jp",
		"ao.it",
		"aogaki.hyogo.jp",
		"aogashima.tokyo.jp",
		"aoki.nagano.jp",
		"aomori.aomori.jp",
		"aomori.jp",
		"aosta-valley.it",
		"aosta.it",
		"aostavalley.it",
		"aoste.it",
		"ap.gov.br",
		"ap.gov.pl",
		"ap.it",
		"aparecida.br",
		"api.br",
		"app.br",
		"aq.it",
		"ar.it",
		"ar.us",
		"arai.shizuoka.jp",
		"arakawa.saitama.jp",
		"arakawa.tokyo.jp",
		"arao.kumamoto.jp",
		"architectes.bj",
		"ardal.no",
		"aremark.no",
		"arendal.no",
		"arezzo.it",
		"ariake.saga.jp",
		"arida.wakayama.jp",
		"aridagawa.wakayama.jp",
		"arita.saga.jp",
		"arna.no",
		"arq.br",
		"arqt.ec",
		"art.br",
		"art.do",
		"art.dz",
		"art.ec",
		"art.ht",
		"art.ml",
		"art.sn",
		"arte.bo",
		"arts.nf",
		"arts.ro",
		"arts.ve",
		"as.us",
		"asago.hyogo.jp",
		"asahi.chiba.jp",
		"asahi.ibaraki.jp",
		"asahi.mie.jp",
		"asahi.nagano.jp",
		"asahi.toyama.jp",
		"asahi.yamagata.jp",
		"asahikawa.hokkaido.jp",
		"asaka.saitama.jp",
		"asakawa.fukushima.jp",
		"asakuchi.okayama.jp",
		"asaminami.hiroshima.jp",
		"ascoli-piceno.it",
		"ascolipiceno.it",
		"aseral.no",
		"ashibetsu.hokkaido.jp",
		"ashikaga.tochigi.jp",
		"ashiya.fukuoka.jp",
		"ashiya.hyogo.jp",
		"ashoro.hokkaido.jp",
		"asker.no",
		"askim.no",
		"askoy.no",
		"askvoll.no",
		"askøy.no",
		"asn.au",
		"asn.lv",
		"asnes.no",
		"aso.kumamoto.jp",
		"ass.km",
		"assabu.hokkaido.jp",
		"assn.lk",
		"asso.ci",
		"asso.dz",
		"asso.fr",
		"asso.gp",
		"asso.ht",
		"asso.km",
		"asso.mc",
		"asso.ml",
		"asso.nc",
		"asso.re",
		"association.aero",
		"assur.bj",
		"asti.it",
		"asuke.aichi.jp",
		"at.it",
		"atami.shizuoka.jp",
		"atm.pl",
		"ato.br",
		"atsugi.kanagawa.jp",
		"atsuma.hokkaido.jp",
		"audnedal.no",
		"augustow.pl",
		"aukra.no",
		"aure.no",
		"aurland.no",
		"aurskog-holand.no",
		"aurskog-høland.no",
		"austevoll.no",
		"austrheim.no",
		"author.aero",
		"auto.pl",
		"av.it",
		"av.tr",
		"avellino.it",
		"averoy.no",
		"averøy.no",
		"avocat.pro",
		"avocats.bj",
		"avoues.fr",
		"awaji.hyogo.jp",
		"aya.miyazaki.jp",
		"ayabe.kyoto.jp",
		"ayagawa.kagawa.jp",
		"ayase.kanagawa.jp",
		"az.us",
		"azumino.nagano.jp",
		"aéroport.ci",
		"b.bg",
		"b.br",
		"b.se",
		"ba.gov.br",
		"ba.it",
		"babia-gora.pl",
		"bacgiang.vn",
		"backan.vn",
		"baclieu.vn",
		"bacninh.vn",
		"badaddja.no",
		"bahcavuotna.no",
		"bahccavuotna.no",
		"baidar.no",
		"bajddar.no",
		"balat.no",
		"balestrand.no",
		"ballangen.no",
		"ballooning.aero",
		"balsan-sudtirol.it",
		"balsan-suedtirol.it",
		"balsan-südtirol.it",
		"balsan.it",
		"balsfjord.no",
		"bamble.no",
		"bandai.fukushima.jp",
		"bando.ibaraki.jp",
		"bank.in",
		"bar.ec",
		"bar.pro",
		"bardu.no",
		"bari.it",
		"baria-vungtau.vn",
		"barletta-trani-andria.it",
		"barlettatraniandria.it",
		"barueri.br",
		"barum.no",
		"bas.it",
		"basilicata.it",
		"bato.tochigi.jp",
		"batsfjord.no",
		"bbs.tr",
		"bc.ca",
		"bd.se",
		"bearalvahki.no",
		"bearalváhki.no",
		"beardu.no",
		"bedzin.pl",
		"beiarn.no",
		"bel.tr",
		"belem.br",
		"belluno.it",
		"benevento.it",
		"bentre.vn",
		"beppu.oita.jp",
		"berg.no",
		"bergamo.it",
		"bergen.no",
		"berlevag.no",
		"berlevåg.no",
		"beskidy.pl",
		"bet.ar",
		"bet.br",
		"bg.it",
		"bhz.br",
		"bi.it",
		"bialowieza.pl",
		"bialystok.pl",
		"bib.br",
		"bib.ve",
		"bibai.hokkaido.jp",
		"biei.hokkaido.jp",
		"bielawa.pl",
		"biella.it",
		"bieszczady.pl",
		"bievat.no",
		"bievát.no",
		"bifuka.hokkaido.jp",
		"bihar.in",
		"bihoro.hokkaido.jp",
		"bindal.no",
		"binhdinh.vn",
		"binhduong.vn",
		"binhphuoc.vn",
		"binhthuan.vn",
		"bio.br",
		"biratori.hokkaido.jp",
		"birkenes.no",
		"biz.az",
		"biz.bb",
		"biz.cy",
		"biz.et",
		"biz.fj",
		"biz.gh",
		"biz.id",
		"biz.in",
		"biz.ki",
		"biz.ls",
		"biz.mv",
		"biz.mw",
		"biz.my",
		"biz.ni",
		"biz.nr",
		"biz.pk",
		"biz.pl",
		"biz.pr",
		"biz.ss",
		"biz.tj",
		"biz.tr",
		"biz.tt",
		"biz.vn",
		"biz.zm",
		"bizen.okayama.jp",
		"bj.cn",
		"bjerkreim.no",
		"bjugn.no",
		"bl.it",
		"blog.bo",
		"blog.br",
		"bmd.br",
		"bn.it",
		"bo.it",
		"bo.nordland.no",
		"bo.telemark.no",
		"boavista.br",
		"bodo.no",
		"bodø.no",
		"bokn.no",
		"boleslawiec.pl",
		"bolivia.bo",
		"bologna.it",
		"bolt.hu",
		"bolzano-altoadige.it",
		"bolzano.it",
		"bomlo.no",
		"bozen-sudtirol.it",
		"bozen-suedtirol.it",
		"bozen-südtirol.it",
		"bozen.it",
		"br.it",
		"brand.se",
		"bremanger.no",
		"brescia.it",
		"brindisi.it",
		"broker.aero",
		"bronnoy.no",
		"bronnoysund.no",
		"brumunddal.no",
		"bryne.no",
		"brønnøy.no",
		"brønnøysund.no",
		"bs.it",
		"bsb.br",
		"bt.it",
		"bu.no",
		"budejju.no",
		"bulsan-sudtirol.it",
		"bulsan-suedtirol.it",
		"bulsan-südtirol.it",
		"bulsan.it",
		"bungoono.oita.jp",
		"bungotakada.oita.jp",
		"bunkyo.tokyo.jp",
		"busan.kr",
		"business.in",
		"buzen.fukuoka.jp",
		"bydgoszcz.pl",
		"bygland.no",
		"bykle.no",
		"bytom.pl",
		"bz.it",
		"báhcavuotna.no",
		"báhccavuotna.no",
		"báidár.no",
		"bájddar.no",
		"bálát.no",
		"bådåddjå.no",
		"båtsfjord.no",
		"bærum.no",
		"bø.nordland.no",
		"bø.telemark.no",
		"bømlo.no",
		"c.bg",
		"c.se",
		"ca.in",
		"ca.it",
		"ca.us",
		"caa.aero",
		"cagliari.it",
		"cahcesuolo.no",
		"cal.it",
		"calabria.it",
		"caltanissetta.it",
		"cam.it",
		"camau.vn",
		"campania.it",
		"campidano-medio.it",
		"campidanomedio.it",
		"campinagrande.br",
		"campinas.br",
		"campobasso.it",
		"cantho.vn",
		"caobang.vn",
		"carbonia-iglesias.it",
		"carboniaiglesias.it",
		"cargo.aero",
		"carrara-massa.it",
		"carraramassa.it",
		"caserta.it",
		"casino.hu",
		"catania.it",
		"catanzaro.it",
		"catering.aero",
		"catholic.edu.au",
		"caxias.br",
		"cb.it",
		"cc.ak.us",
		"cc.al.us",
		"cc.ar.us",
		"cc.as.us",
		"cc.az.us",
		"cc.ca.us",
		"cc.co.us",
		"cc.ct.us",
		"cc.dc.us",
		"cc.de.us",
		"cc.fl.us",
		"cc.ga.us",
		"cc.gu.us",
		"cc.hi.us",
		"cc.ia.us",
		"cc.id.us",
		"cc.il.us",
		"cc.in.us",
		"cc.ks.us",
		"cc.ky.us",
		"cc.la.us",
		"cc.ma.us",
		"cc.md.us",
		"cc.me.us",
		"cc.mi.us",
		"cc.mn.us",
		"cc.mo.us",
		"cc.ms.us",
		"cc.mt.us",
		"cc.nc.us",
		"cc.ne.us",
		"cc.nh.us",
		"cc.nj.us",
		"cc.nm.us",
		"cc.nv.us",
		"cc.ny.us",
		"cc.oh.us",
		"cc.ok.us",
		"cc.or.us",
		"cc.pa.us",
		"cc.pr.us",
		"cc.ri.us",
		"cc.sc.us",
		"cc.sd.us",
		"cc.tn.us",
		"cc.tx.us",
		"cc.ut.us",
		"cc.va.us",
		"cc.vi.us",
		"cc.vt.us",
		"cc.wa.us",
		"cc.wi.us",
		"cc.wv.us",
		"cc.wy.us",
		"cci.fr",
		"ce.gov.br",
		"ce.it",
		"certification.aero",
		"cesena-forli.it",
		"cesena-forlì.it",
		"cesenaforli.it",
		"cesenaforlì.it",
		"ch.it",
		"championship.aero",
		"charter.aero",
		"chef.ec",
		"cherkassy.ua",
		"cherkasy.ua",
		"chernigov.ua",
		"chernihiv.ua",
		"chernivtsi.ua",
		"chernovtsy.ua",
		"chiba.jp",
		"chichibu.saitama.jp",
		"chieti.it",
		"chigasaki.kanagawa.jp",
		"chihayaakasaka.osaka.jp",
		"chijiwa.nagasaki.jp",
		"chikugo.fukuoka.jp",
		"chikuho.fukuoka.jp",
		"chikuhoku.nagano.jp",
		"chikujo.fukuoka.jp",
		"chikuma.nagano.jp",
		"chikusei.ibaraki.jp",
		"chikushino.fukuoka.jp",
		"chikuzen.fukuoka.jp",
		"chino.nagano.jp",
		"chippubetsu.hokkaido.jp",
		"chiryu.aichi.jp",
		"chita.aichi.jp",
		"chitose.hokkaido.jp",
		"chiyoda.gunma.jp",
		"chiyoda.tokyo.jp",
		"chizu.tottori.jp",
		"chofu.tokyo.jp",
		"chonan.chiba.jp",
		"chosei.chiba.jp",
		"choshi.chiba.jp",
		"choyo.kumamoto.jp",
		"chtr.k12.ma.us",
		"chungbuk.kr",
		"chungnam.kr",
		"chuo.chiba.jp",
		"chuo.fukuoka.jp",
		"chuo.osaka.jp",
		"chuo.tokyo.jp",
		"chuo.yamanashi.jp",
		"ci.it",
		"ciencia.bo",
		"cieszyn.pl",
		"cim.br",
		"city.hu",
		"civilaviation.aero",
		"ck.ua",
		"cl.it",
		"club.aero",
		"club.tw",
		"cn.in",
		"cn.it",
		"cn.ua",
		"cng.br",
		"cnt.br",
		"co.ae",
		"co.ag",
		"co.am",
		"co.ao",
		"co.at",
		"co.az",
		"co.bb",
		"co.bd",
		"co.bi",
		"co.bj",
		"co.bw",
		"co.bz",
		"co.ci",
		"co.cl",
		"co.cm",
		"co.cr",
		"co.dm",
		"co.gg",
		"co.gl",
		"co.gy",
		"co.hu",
		"co.id",
		"co.il",
		"co.im",
		"co.in",
		"co.io",
		"co.ir",
		"co.it",
		"co.je",
		"co.jp",
		"co.ke",
		"co.kr",
		"co.lc",
		"co.ls",
		"co.ma",
		"co.me",
		"co.mg",
		"co.mu",
		"co.mw",
		"co.mz",
		"co.na",
		"co.ni",
		"co.nz",
		"co.om",
		"co.pn",
		"co.rs",
		"co.rw",
		"co.ss",
		"co.st",
		"co.sz",
		"co.th",
		"co.tj",
		"co.tm",
		"co.tt",
		"co.tz",
		"co.ug",
		"co.uk",
		"co.us",
		"co.uz",
		"co.ve",
		"co.vi",
		"co.za",
		"co.zm",
		"co.zw",
		"cog.mi.us",
		"com.ac",
		"com.af",
		"com.ag",
		"com.ai",
		"com.al",
		"com.am",
		"com.ar",
		"com.au",
		"com.aw",
		"com.az",
		"com.ba",
		"com.bb",
		"com.bd",
		"com.bh",
		"com.bi",
		"com.bj",
		"com.bm",
		"com.bn",
		"com.bo",
		"com.br",
		"com.bs",
		"com.bt",
		"com.by",
		"com.bz",
		"com.ci",
		"com.cm",
		"com.cn",
		"com.co",
		"com.cu",
		"com.cv",
		"com.cw",
		"com.cy",
		"com.dm",
		"com.do",
		"com.dz",
		"com.ec",
		"com.ee",
		"com.eg",
		"com.es",
		"com.et",
		"com.fj",
		"com.fm",
		"com.fr",
		"com.ge",
		"com.gh",
		"com.gi",
		"com.gl",
		"com.gn",
		"com.gp",
		"com.gr",
		"com.gt",
		"com.gu",
		"com.gy",
		"com.hk",
		"com.hn",
		"com.hr",
		"com.ht",
		"com.im",
		"com.in",
		"com.io",
		"com.iq",
		"com.jo",
		"com.kg",
		"com.kh",
		"com.ki",
		"com.km",
		"com.kp",
		"com.kw",
		"com.ky",
		"com.kz",
		"com.la",
		"com.lb",
		"com.lc",
		"com.lk",
		"com.lr",
		"com.lv",
		"com.ly",
		"com.mg",
		"com.mk",
		"com.ml",
		"com.mo",
		"com.ms",
		"com.mt",
		"com.mu",
		"com.mv",
		"com.mw",
		"com.mx",
		"com.my",
		"com.na",
		"com.nf",
		"com.ng",
		"com.ni",
		"com.nr",
		"com.om",
		"com.pa",
		"com.pe",
		"com.pf",
		"com.ph",
		"com.pk",
		"com.pl",
		"com.pr",
		"com.ps",
		"com.pt",
		"com.py",
		"com.qa",
		"com.re",
		"com.ro",
		"com.sa",
		"com.sb",
		"com.sc",
		"com.sd",
		"com.sg",
		"com.sh",
		"com.sl",
		"com.sn",
		"com.so",
		"com.ss",
		"com.st",
		"com.sv",
		"com.sy",
		"com.tj",
		"com.tm",
		"com.tn",
		"com.to",
		"com.tr",
		"com.tt",
		"com.tw",
		"com.ua",
		"com.ug",
		"com.uy",
		"com.uz",
		"com.vc",
		"com.ve",
		"com.vi",
		"com.vn",
		"com.vu",
		"com.ws",
		"com.ye",
		"com.zm",
		"commune.am",
		"como.it",
		"conf.au",
		"conf.lv",
		"conference.aero",
		"consulado.st",
		"consultant.aero",
		"consulting.aero",
		"cont.ec",
		"contagem.br",
		"control.aero",
		"coop.ar",
		"coop.br",
		"coop.ht",
		"coop.in",
		"coop.km",
		"coop.mv",
		"coop.mw",
		"coop.py",
		"coop.rw",
		"cooperativa.bo",
		"cosenza.it",
		"council.aero",
		"coz.br",
		"cpa.ec",
		"cpa.pro",
		"cq.cn",
		"cr.it",
		"cr.ua",
		"cremona.it",
		"crew.aero",
		"cri.br",
		"cri.nz",
		"crimea.ua",
		"crotone.it",
		"cs.in",
		"cs.it",
		"ct.it",
		"ct.us",
		"cue.ec",
		"cuiaba.br",
		"cuneo.it",
		"curitiba.br",
		"cv.ua",
		"cyb.ge",
		"cz.it",
		"czeladz.pl",
		"czest.pl",
		"d.bg",
		"d.se",
		"daegu.kr",
		"daejeon.kr",
		"daigo.ibaraki.jp",
		"daisen.akita.jp",
		"daito.osaka.jp",
		"daiwa.hiroshima.jp",
		"daklak.vn",
		"daknong.vn",
		"danang.vn",
		"date.fukushima.jp",
		"date.hokkaido.jp",
		"davvenjarga.no",
		"davvenjárga.no",
		"davvesiida.no",
		"dazaifu.fukuoka.jp",
		"dc.us",
		"de.us",
		"deatnu.no",
		"def.br",
		"delhi.in",
		"dell-ogliastra.it",
		"dellogliastra.it",
		"democracia.bo",
		"dent.ec",
		"dep.no",
		"deporte.bo",
		"des.br",
		"desa.id",
		"design.aero",
		"det.br",
		"dev.br",
		"df.gov.br",
		"dgca.aero",
		"dgn.ec",
		"dielddanuorri.no",
		"dienbien.vn",
		"disco.ec",
		"divtasvuodna.no",
		"divttasvuotna.no",
		"dlugoleka.pl",
		"dn.ua",
		"dnepropetrovsk.ua",
		"dni.us",
		"dnipropetrovsk.ua",
		"doc.ec",
		"donetsk.ua",
		"dongnai.vn",
		"dongthap.vn",
		"donna.no",
		"doshi.yamanashi.jp",
		"dovre.no",
		"dp.ua",
		"dr.in",
		"dr.tr",
		"drammen.no",
		"drangedal.no",
		"drobak.no",
		"drøbak.no",
		"dst.mi.us",
		"dyroy.no",
		"dyrøy.no",
		"dønna.no",
		"e.bg",
		"e.se",
		"e12.ve",
		"e164.arpa",
		"eaton.mi.us",
		"ebetsu.hokkaido.jp",
		"ebina.kanagawa.jp",
		"ebino.miyazaki.jp",
		"ebiz.tw",
		"echizen.fukui.jp",
		"ecn.br",
		"eco.bj",
		"eco.br",
		"ecologia.bo",
		"econo.bj",
		"economia.bo",
		"ed.ao",
		"ed.ci",
		"ed.cr",
		"ed.jp",
		"edogawa.tokyo.jp",
		"edu.ac",
		"edu.af",
		"edu.al",
		"edu.ao",
		"edu.ar",
		"edu.au",
		"edu.az",
		"edu.ba",
		"edu.bb",
		"edu.bd",
		"edu.bh",
		"edu.bi",
		"edu.bj",
		"edu.bm",
		"edu.bn",
		"edu.bo",
		"edu.br",
		"edu.bs",
		"edu.bt",
		"edu.bz",
		"edu.ci",
		"edu.cn",
		"edu.co",
		"edu.cu",
		"edu.cv",
		"edu.cw",
		"edu.dm",
		"edu.do",
		"edu.dz",
		"edu.ec",
		"edu.ee",
		"edu.eg",
		"edu.es",
		"edu.et",
		"edu.fj",
		"edu.fm",
		"edu.gd",
		"edu.ge",
		"edu.gh",
		"edu.gi",
		"edu.gl",
		"edu.gn",
		"edu.gp",
		"edu.gr",
		"edu.gt",
		"edu.gu",
		"edu.gy",
		"edu.hk",
		"edu.hn",
		"edu.ht",
		"edu.in",
		"edu.io",
		"edu.iq",
		"edu.it",
		"edu.jo",
		"edu.kg",
		"edu.kh",
		"edu.ki",
		"edu.km",
		"edu.kn",
		"edu.kp",
		"edu.kw",
		"edu.ky",
		"edu.kz",
		"edu.la",
		"edu.lb",
		"edu.lc",
		"edu.lk",
		"edu.lr",
		"edu.ls",
		"edu.lv",
		"edu.ly",
		"edu.me",
		"edu.mg",
		"edu.mk",
		"edu.ml",
		"edu.mn",
		"edu.mo",
		"edu.ms",
		"edu.mt",
		"edu.mv",
		"edu.mw",
		"edu.mx",
		"edu.my",
		"edu.mz",
		"edu.ng",
		"edu.ni",
		"edu.nr",
		"edu.om",
		"edu.pa",
		"edu.pe",
		"edu.pf",
		"edu.ph",
		"edu.pk",
		"edu.pl",
		"edu.pn",
		"edu.pr",
		"edu.ps",
		"edu.pt",
		"edu.py",
		"edu.qa",
		"edu.rs",
		"edu.sa",
		"edu.sb",
		"edu.sc",
		"edu.sd",
		"edu.sg",
		"edu.sl",
		"edu.sn",
		"edu.so",
		"edu.ss",
		"edu.st",
		"edu.sv",
		"edu.sy",
		"edu.tj",
		"edu.tm",
		"edu.to",
		"edu.tr",
		"edu.tt",
		"edu.tw",
		"edu.ua",
		"edu.ug",
		"edu.uy",
		"edu.vc",
		"edu.ve",
		"edu.vg",
		"edu.vn",
		"edu.vu",
		"edu.ws",
		"edu.ye",
		"edu.za",
		"edu.zm",
		"educator.aero",
		"egersund.no",
		"ehime.jp",
		"eid.no",
		"eidfjord.no",
		"eidsberg.no",
		"eidskog.no",
		"eidsvoll.no",
		"eigersund.no",
		"eiheiji.fukui.jp",
		"ekloges.cy",
		"elblag.pl",
		"elk.pl",
		"elverum.no",
		"emb.kw",
		"embaixada.st",
		"embetsu.hokkaido.jp",
		"emergency.aero",
		"emilia-romagna.it",
		"emiliaromagna.it",
		"emp.br",
		"emprende.ve",
		"empresa.bo",
		"emr.it",
		"en.it",
		"ena.gifu.jp",
		"enebakk.no",
		"enf.br",
		"eng.br",
		"eng.ec",
		"eng.jo",
		"eng.pro",
		"engerdal.no",
		"engine.aero",
		"engineer.aero",
		"eniwa.hokkaido.jp",
		"enna.it",
		"ens.tn",
		"entertainment.aero",
		"equipment.aero",
		"er.in",
		"erimo.hokkaido.jp",
		"erotica.hu",
		"erotika.hu",
		"es.gov.br",
		"es.kr",
		"esan.hokkaido.jp",
		"esashi.hokkaido.jp",
		"esm.ec",
		"esp.br",
		"est.pr",
		"etajima.hiroshima.jp",
		"etc.br",
		"eti.br",
		"etne.no",
		"etnedal.no",
		"eu.int",
		"eun.eg",
		"evenassi.no",
		"evenes.no",
		"evenášši.no",
		"evje-og-hornnes.no",
		"exchange.aero",
		"express.aero",
		"f.bg",
		"f.se",
		"fam.pk",
		"far.br",
		"farsund.no",
		"fauske.no",
		"fc.it",
		"fe.it",
		"federation.aero",
		"fedje.no",
		"feira.br",
		"fermo.it",
		"ferrara.it",
		"fet.no",
		"fetsund.no",
		"fg.it",
		"fh.se",
		"fhs.no",
		"fhsk.se",
		"fhv.se",
		"fi.cr",
		"fi.it",
		"fie.ee",
		"film.hu",
		"fin.ec",
		"fin.in",
		"fin.tn",
		"finnoy.no",
		"finnøy.no",
		"firenze.it",
		"firm.ht",
		"firm.in",
		"firm.nf",
		"firm.ro",
		"firm.ve",
		"fitjar.no",
		"fj.cn",
		"fjaler.no",
		"fjell.no",
		"fl.us",
		"fla.no",
		"flakstad.no",
		"flatanger.no",
		"flekkefjord.no",
		"flesberg.no",
		"flight.aero",
		"flog.br",
		"flora.no",
		"florence.it",
		"floripa.br",
		"floro.no",
		"florø.no",
		"flå.no",
		"fm.br",
		"fm.it",
		"fm.jo",
		"fm.no",
		"fnd.br",
		"foggia.it",
		"folkebibl.no",
		"folldal.no",
		"forde.no",
		"forli-cesena.it",
		"forlicesena.it",
		"forlì-cesena.it",
		"forlìcesena.it",
		"forsand.no",
		"fortal.br",
		"forum.hu",
		"fosnes.no",
		"fot.br",
		"fot.ec",
		"foz.br",
		"fr.it",
		"frana.no",
		"fredrikstad.no",
		"freight.aero",
		"friuli-v-giulia.it",
		"friuli-ve-giulia.it",
		"friuli-vegiulia.it",
		"friuli-venezia-giulia.it",
		"friuli-veneziagiulia.it",
		"friuli-vgiulia.it",
		"friuliv-giulia.it",
		"friulive-giulia.it",
		"friulivegiulia.it",
		"friulivenezia-giulia.it",
		"friuliveneziagiulia.it",
		"friulivgiulia.it",
		"frogn.no",
		"froland.no",
		"from.hr",
		"frosinone.it",
		"frosta.no",
		"froya.no",
		"fræna.no",
		"frøya.no",
		"fst.br",
		"fuchu.hiroshima.jp",
		"fuchu.tokyo.jp",
		"fuchu.toyama.jp",
		"fudai.iwate.jp",
		"fuefuki.yamanashi.jp",
		"fuel.aero",
		"fuji.shizuoka.jp",
		"fujieda.shizuoka.jp",
		"fujiidera.osaka.jp",
		"fujikawa.shizuoka.jp",
		"fujikawa.yamanashi.jp",
		"fujikawaguchiko.yamanashi.jp",
		"fujimi.nagano.jp",
		"fujimi.saitama.jp",
		"fujimino.saitama.jp",
		"fujinomiya.shizuoka.jp",
		"fujioka.gunma.jp",
		"fujisato.akita.jp",
		"fujisawa.iwate.jp",
		"fujisawa.kanagawa.jp",
		"fujishiro.ibaraki.jp",
		"fujiyoshida.yamanashi.jp",
		"fukagawa.hokkaido.jp",
		"fukaya.saitama.jp",
		"fukuchi.fukuoka.jp",
		"fukuchiyama.kyoto.jp",
		"fukudomi.saga.jp",
		"fukui.fukui.jp",
		"fukui.jp",
		"fukumitsu.toyama.jp",
		"fukuoka.jp",
		"fukuroi.shizuoka.jp",
		"fukusaki.hyogo.jp",
		"fukushima.fukushima.jp",
		"fukushima.hokkaido.jp",
		"fukushima.jp",
		"fukuyama.hiroshima.jp",
		"funabashi.chiba.jp",
		"funagata.yamagata.jp",
		"funahashi.toyama.jp",
		"fuoisku.no",
		"fuossko.no",
		"furano.hokkaido.jp",
		"furubira.hokkaido.jp",
		"furudono.fukushima.jp",
		"furukawa.miyagi.jp",
		"fusa.no",
		"fuso.aichi.jp",
		"fussa.tokyo.jp",
		"futaba.fukushima.jp",
		"futsu.nagasaki.jp",
		"futtsu.chiba.jp",
		"fvg.it",
		"fylkesbibl.no",
		"fyresdal.no",
		"førde.no",
		"g.bg",
		"g.se",
		"g12.br",
		"ga.us",
		"gaivuotna.no",
		"gal.ec",
		"galsa.no",
		"gamagori.aichi.jp",
		"game.tw",
		"games.hu",
		"gamo.shiga.jp",
		"gamvik.no",
		"gangaviika.no",
		"gangwon.kr",
		"gaular.no",
		"gausdal.no",
		"gc.ca",
		"gd.cn",
		"ge.it",
		"geek.nz",
		"geisei.kochi.jp",
		"gen.in",
		"gen.mi.us",
		"gen.nz",
		"gen.tr",
		"genkai.saga.jp",
		"genoa.it",
		"genova.it",
		"geo.br",
		"ggf.br",
		"gialai.vn",
		"giehtavuoatna.no",
		"gielda.no",
		"gifu.gifu.jp",
		"gifu.jp",
		"gildeskal.no",
		"gildeskål.no",
		"ginan.gifu.jp",
		"ginowan.okinawa.jp",
		"ginoza.okinawa.jp",
		"giske.no",
		"github.io",
		"gitlab.io",
		"gjemnes.no",
		"gjerdrum.no",
		"gjerstad.no",
		"gjesdal.no",
		"gjovik.no",
		"gjøvik.no",
		"gkp.pk",
		"gliding.aero",
		"glogow.pl",
		"gloppen.no",
		"gmina.pl",
		"gniezno.pl",
		"go.ci",
		"go.cr",
		"go.gov.br",
		"go.id",
		"go.it",
		"go.jp",
		"go.ke",
		"go.kr",
		"go.th",
		"go.tj",
		"go.tz",
		"go.ug",
		"gob.ar",
		"gob.bo",
		"gob.cl",
		"gob.cu",
		"gob.do",
		"gob.ec",
		"gob.es",
		"gob.gt",
		"gob.hn",
		"gob.mx",
		"gob.ni",
		"gob.pa",
		"gob.pe",
		"gob.pk",
		"gob.sv",
		"gob.ve",
		"gobo.wakayama.jp",
		"godo.gifu.jp",
		"gog.pk",
		"goiania.br",
		"gojome.akita.jp",
		"gok.pk",
		"gokase.miyazaki.jp",
		"gol.no",
		"gonohe.aomori.jp",
		"gop.pk",
		"gorizia.it",
		"gorlice.pl",
		"gos.pk",
		"gose.nara.jp",
		"gosen.niigata.jp",
		"goshiki.hyogo.jp",
		"gotemba.shizuoka.jp",
		"goto.nagasaki.jp",
		"gotsu.shimane.jp",
		"gouv.ci",
		"gouv.fr",
		"gouv.ht",
		"gouv.km",
		"gouv.ml",
		"gouv.sn",
		"gov.ac",
		"gov.ae",
		"gov.af",
		"gov.al",
		"gov.ao",
		"gov.ar",
		"gov.as",
		"gov.au",
		"gov.az",
		"gov.ba",
		"gov.bb",
		"gov.bd",
		"gov.bf",
		"gov.bh",
		"gov.bm",
		"gov.bn",
		"gov.br",
		"gov.bs",
		"gov.bt",
		"gov.bw",
		"gov.by",
		"gov.bz",
		"gov.cd",
		"gov.cl",
		"gov.cm",
		"gov.cn",
		"gov.co",
		"gov.cx",
		"gov.cy",
		"gov.cz",
		"gov.dm",
		"gov.do",
		"gov.dz",
		"gov.ec",
		"gov.ee",
		"gov.eg",
		"gov.et",
		"gov.fj",
		"gov.gd",
		"gov.ge",
		"gov.gh",
		"gov.gi",
		"gov.gn",
		"gov.gr",
		"gov.gu",
		"gov.gy",
		"gov.hk",
		"gov.ie",
		"gov.il",
		"gov.in",
		"gov.io",
		"gov.iq",
		"gov.ir",
		"gov.it",
		"gov.jo",
		"gov.kg",
		"gov.kh",
		"gov.ki",
		"gov.km",
		"gov.kn",
		"gov.kp",
		"gov.kw",
		"gov.kz",
		"gov.la",
		"gov.lb",
		"gov.lc",
		"gov.lk",
		"gov.lr",
		"gov.ls",
		"gov.lt",
		"gov.lv",
		"gov.ly",
		"gov.ma",
		"gov.me",
		"gov.mg",
		"gov.mk",
		"gov.ml",
		"gov.mn",
		"gov.mo",
		"gov.mr",
		"gov.ms",
		"gov.mu",
		"gov.mv",
		"gov.mw",
		"gov.my",
		"gov.mz",
		"gov.na",
		"gov.nc.tr",
		"gov.ng",
		"gov.nr",
		"gov.om",
		"gov.ph",
		"gov.pk",
		"gov.pl",
		"gov.pn",
		"gov.pr",
		"gov.ps",
		"gov.pt",
		"gov.pw",
		"gov.py",
		"gov.qa",
		"gov.rs",
		"gov.rw",
		"gov.sa",
		"gov.sb",
		"gov.sc",
		"gov.sd",
		"gov.sg",
		"gov.sh",
		"gov.sl",
		"gov.so",
		"gov.ss",
		"gov.sx",
		"gov.sy",
		"gov.tj",
		"gov.tl",
		"gov.tm",
		"gov.tn",
		"gov.to",
		"gov.tr",
		"gov.tt",
		"gov.tw",
		"gov.ua",
		"gov.ug",
		"gov.uk",
		"gov.vc",
		"gov.ve",
		"gov.vn",
		"gov.ws",
		"gov.ye",
		"gov.za",
		"gov.zm",
		"gov.zw",
		"government.aero",
		"govt.nz",
		"gr.it",
		"gr.jp",
		"grajewo.pl",
		"gran.no",
		"grane.no",
		"granvin.no",
		"gratangen.no",
		"greta.fr",
		"grimstad.no",
		"griw.gov.pl",
		"grondar.za",
		"grong.no",
		"grosseto.it",
		"groundhandling.aero",
		"group.aero",
		"grp.lk",
		"gru.br",
		"grue.no",
		"gs.aa.no",
		"gs.ah.no",
		"gs.bu.no",
		"gs.cn",
		"gs.fm.no",
		"gs.hl.no",
		"gs.hm.no",
		"gs.jan-mayen.no",
		"gs.mr.no",
		"gs.nl.no",
		"gs.nt.no",
		"gs.of.no",
		"gs.ol.no",
		"gs.oslo.no",
		"gs.rl.no",
		"gs.sf.no",
		"gs.st.no",
		"gs.svalbard.no",
		"gs.tm.no",
		"gs.tr.no",
		"gs.va.no",
		"gs.vf.no",
		"gsm.pl",
		"gu.us",
		"guam.gu",
		"gub.uy",
		"gujarat.in",
		"gujo.gifu.jp",
		"gulen.no",
		"gunma.jp",
		"guovdageaidnu.no",
		"gushikami.okinawa.jp",
		"gv.ao",
		"gv.at",
		"gwangju.kr",
		"gx.cn",
		"gye.ec",
		"gyeongbuk.kr",
		"gyeonggi.kr",
		"gyeongnam.kr",
		"gyokuto.kumamoto.jp",
		"gz.cn",
		"gáivuotna.no",
		"gálsá.no",
		"gáŋgaviika.no",
		"h.bg",
		"h.se",
		"ha.cn",
		"ha.no",
		"habikino.osaka.jp",
		"habmer.no",
		"haboro.hokkaido.jp",
		"hachijo.tokyo.jp",
		"hachinohe.aomori.jp",
		"hachioji.tokyo.jp",
		"hachirogata.akita.jp",
		"hadano.kanagawa.jp",
		"hadsel.no",
		"haebaru.okinawa.jp",
		"haga.tochigi.jp",
		"hagebostad.no",
		"hagi.yamaguchi.jp",
		"hagiang.vn",
		"haibara.shizuoka.jp",
		"haiduong.vn",
		"haiphong.vn",
		"hakata.fukuoka.jp",
		"hakodate.hokkaido.jp",
		"hakone.kanagawa.jp",
		"hakuba.nagano.jp",
		"hakui.ishikawa.jp",
		"hakusan.ishikawa.jp",
		"halden.no",
		"halsa.no",
		"hamada.shimane.jp",
		"hamamatsu.shizuoka.jp",
		"hamar.no",
		"hamaroy.no",
		"hamarøy.no",
		"hamatama.saga.jp",
		"hamatonbetsu.hokkaido.jp",
		"hammarfeasta.no",
		"hammerfest.no",
		"hamura.tokyo.jp",
		"hanam.vn",
		"hanamaki.iwate.jp",
		"hanamigawa.chiba.jp",
		"hanawa.fukushima.jp",
		"handa.aichi.jp",
		"hanggliding.aero",
		"hannan.osaka.jp",
		"hanno.saitama.jp",
		"hanoi.vn",
		"hanyu.saitama.jp",
		"hapmir.no",
		"happou.akita.jp",
		"hara.nagano.jp",
		"haram.no",
		"hareid.no",
		"harima.hyogo.jp",
		"harstad.no",
		"hasama.oita.jp",
		"hasami.nagasaki.jp",
		"hashikami.aomori.jp",
		"hashima.gifu.jp",
		"hashimoto.wakayama.jp",
		"hasuda.saitama.jp",
		"hasvik.no",
		"hatinh.vn",
		"hatogaya.saitama.jp",
		"hatoyama.saitama.jp",
		"hatsukaichi.hiroshima.jp",
		"hattfjelldal.no",
		"haugesund.no",
		"haugiang.vn",
		"hayakawa.yamanashi.jp",
		"hayashima.okayama.jp",
		"hazu.aichi.jp",
		"hb.cn",
		"he.cn",
		"health.nz",
		"health.vn",
		"heguri.nara.jp",
		"hekinan.aichi.jp",
		"hemne.no",
		"hemnes.no",
		"hemsedal.no",
		"herad.no",
		"heroy.more-og-romsdal.no",
		"heroy.nordland.no",
		"herøy.møre-og-romsdal.no",
		"herøy.nordland.no",
		"hi.cn",
		"hi.us",
		"hichiso.gifu.jp",
		"hida.gifu.jp",
		"hidaka.hokkaido.jp",
		"hidaka.kochi.jp",
		"hidaka.saitama.jp",
		"hidaka.wakayama.jp",
		"higashi.fukuoka.jp",
		"higashi.fukushima.jp",
		"higashi.okinawa.jp",
		"higashiagatsuma.gunma.jp",
		"higashichichibu.saitama.jp",
		"higashihiroshima.hiroshima.jp",
		"higashiizu.shizuoka.jp",
		"higashiizumo.shimane.jp",
		"higashikagawa.kagawa.jp",
		"higashikagura.hokkaido.jp",
		"higashikawa.hokkaido.jp",
		"higashikurume.tokyo.jp",
		"higashimatsushima.miyagi.jp",
		"higashimatsuyama.saitama.jp",
		"higashimurayama.tokyo.jp",
		"higashinaruse.akita.jp",
		"higashine.yamagata.jp",
		"higashiomi.shiga.jp",
		"higashiosaka.osaka.jp",
		"higashishirakawa.gifu.jp",
		"higashisumiyoshi.osaka.jp",
		"higashitsuno.kochi.jp",
		"higashiura.aichi.jp",
		"higashiyama.kyoto.jp",
		"higashiyamato.tokyo.jp",
		"higashiyodogawa.osaka.jp",
		"higashiyoshino.nara.jp",
		"hiji.oita.jp",
		"hikari.yamaguchi.jp",
		"hikawa.shimane.jp",
		"hikimi.shimane.jp",
		"hikone.shiga.jp",
		"himeji.hyogo.jp",
		"himeshima.oita.jp",
		"himi.toyama.jp",
		"hino.tokyo.jp",
		"hino.tottori.jp",
		"hinode.tokyo.jp",
		"hinohara.tokyo.jp",
		"hioki.kagoshima.jp",
		"hirado.nagasaki.jp",
		"hiraizumi.iwate.jp",
		"hirakata.osaka.jp",
		"hiranai.aomori.jp",
		"hirara.okinawa.jp",
		"hirata.fukushima.jp",
		"hiratsuka.kanagawa.jp",
		"hiraya.nagano.jp",
		"hirogawa.wakayama.jp",
		"hirokawa.fukuoka.jp",
		"hirono.fukushima.jp",
		"hirono.iwate.jp",
		"hiroo.hokkaido.jp",
		"hirosaki.aomori.jp",
		"hiroshima.jp",
		"hisayama.fukuoka.jp",
		"hita.oita.jp",
		"hitachi.ibaraki.jp",
		"hitachinaka.ibaraki.jp",
		"hitachiomiya.ibaraki.jp",
		"hitachiota.ibaraki.jp",
		"hitra.no",
		"hizen.saga.jp",
		"hjartdal.no",
		"hjelmeland.no",
		"hk.cn",
		"hl.cn",
		"hl.no",
		"hm.no",
		"hn.cn",
		"hoabinh.vn",
		"hobol.no",
		"hobøl.no",
		"hof.no",
		"hofu.yamaguchi.jp",
		"hokkaido.jp",
		"hokksund.no",
		"hokuryu.hokkaido.jp",
		"hokuto.hokkaido.jp",
		"hokuto.yamanashi.jp",
		"hol.no",
		"hole.no",
		"holmestrand.no",
		"holtalen.no",
		"holtålen.no",
		"home.arpa",
		"homebuilt.aero",
		"honai.ehime.jp",
		"honbetsu.hokkaido.jp",
		"honefoss.no",
		"hongo.hiroshima.jp",
		"honjo.akita.jp",
		"honjo.saitama.jp",
		"honjyo.akita.jp",
		"hornindal.no",
		"horokanai.hokkaido.jp",
		"horonobe.hokkaido.jp",
		"horten.no",
		"hotel.hu",
		"hotel.lk",
		"hotel.tz",
		"hoyanger.no",
		"hoylandet.no",
		"hs.kr",
		"hue.vn",
		"huissier-justice.fr",
		"hungyen.vn",
		"hurdal.no",
		"hurum.no",
		"hvaler.no",
		"hyllestad.no",
		"hyogo.jp",
		"hyuga.miyazaki.jp",
		"hábmer.no",
		"hámmárfeasta.no",
		"hápmir.no",
		"hå.no",
		"hægebostad.no",
		"hønefoss.no",
		"høyanger.no",
		"høylandet.no",
		"i.bg",
		"i.ng",
		"i.ph",
		"i.se",
		"ia.bo",
		"ia.br",
		"ia.us",
		"ia.ve",
		"ibara.okayama.jp",
		"ibaraki.ibaraki.jp",
		"ibaraki.jp",
		"ibaraki.osaka.jp",
		"ibestad.no",
		"ibigawa.gifu.jp",
		"ibr.ec",
		"ic.gov.pl",
		"ichiba.tokushima.jp",
		"ichihara.chiba.jp",
		"ichikai.tochigi.jp",
		"ichikawa.chiba.jp",
		"ichikawa.hyogo.jp",
		"ichikawamisato.yamanashi.jp",
		"ichinohe.iwate.jp",
		"ichinomiya.aichi.jp",
		"ichinomiya.chiba.jp",
		"ichinoseki.iwate.jp",
		"id.au",
		"id.bd",
		"id.cv",
		"id.fj",
		"id.ir",
		"id.lv",
		"id.ly",
		"id.us",
		"id.vn",
		"ide.kyoto.jp",
		"idf.il",
		"idrett.no",
		"idv.hk",
		"idv.tw",
		"if.ua",
		"iglesias-carbonia.it",
		"iglesiascarbonia.it",
		"iheya.okinawa.jp",
		"iida.nagano.jp",
		"iide.yamagata.jp",
		"iijima.nagano.jp",
		"iitate.fukushima.jp",
		"iiyama.nagano.jp",
		"iizuka.fukuoka.jp",
		"iizuna.nagano.jp",
		"ikaruga.nara.jp",
		"ikata.ehime.jp",
		"ikawa.akita.jp",
		"ikeda.fukui.jp",
		"ikeda.gifu.jp",
		"ikeda.hokkaido.jp",
		"ikeda.nagano.jp",
		"ikeda.osaka.jp",
		"iki.nagasaki.jp",
		"ikoma.nara.jp",
		"ikusaka.nagano.jp",
		"il.us",
		"ilawa.pl",
		"im.it",
		"imabari.ehime.jp",
		"imakane.hokkaido.jp",
		"imari.saga.jp",
		"imb.br",
		"imizu.toyama.jp",
		"imperia.it",
		"in-addr.arpa",
		"in.ni",
		"in.rs",
		"in.th",
		"in.ua",
		"in.us",
		"ina.ibaraki.jp",
		"ina.nagano.jp",
		"ina.saitama.jp",
		"inabe.mie.jp",
		"inagawa.hyogo.jp",
		"inagi.tokyo.jp",
		"inami.toyama.jp",
		"inami.wakayama.jp",
		"inashiki.ibaraki.jp",
		"inatsuki.fukuoka.jp",
		"inawashiro.fukushima.jp",
		"inazawa.aichi.jp",
		"incheon.kr",
		"ind.br",
		"ind.gt",
		"ind.in",
		"ind.kw",
		"ind.tn",
		"inderoy.no",
		"inderøy.no",
		"indigena.bo",
		"industria.bo",
		"ine.kyoto.jp",
		"inf.br",
		"inf.cu",
		"inf.mk",
		"info.az",
		"info.bb",
		"info.bd",
		"info.bj",
		"info.bo",
		"info.ec",
		"info.eg",
		"info.et",
		"info.fj",
		"info.gu",
		"info.ht",
		"info.hu",
		"info.in",
		"info.ke",
		"info.ki",
		"info.la",
		"info.ls",
		"info.ml",
		"info.mv",
		"info.nf",
		"info.ni",
		"info.nr",
		"info.pl",
		"info.pr",
		"info.ro",
		"info.sd",
		"info.tn",
		"info.tr",
		"info.tt",
		"info.tz",
		"info.ve",
		"info.vn",
		"info.zm",
		"ing.pa",
		"ingatlan.hu",
		"ino.kochi.jp",
		"inst.ml",
		"insurance.aero",
		"int.ar",
		"int.az",
		"int.bo",
		"int.ci",
		"int.cv",
		"int.in",
		"int.la",
		"int.lk",
		"int.mv",
		"int.mw",
		"int.ni",
		"int.pt",
		"int.tj",
		"int.ve",
		"int.vn",
		"internet.in",
		"intl.tn",
		"inuyama.aichi.jp",
		"inzai.chiba.jp",
		"io.in",
		"io.kr",
		"io.vn",
		"ip6.arpa",
		"iris.arpa",
		"iruma.saitama.jp",
		"is.gov.pl",
		"is.it",
		"isa.kagoshima.jp",
		"isa.us",
		"isahaya.nagasaki.jp",
		"ise.mie.jp",
		"isehara.kanagawa.jp",
		"isen.kagoshima.jp",
		"isernia.it",
		"isesaki.gunma.jp",
		"ishigaki.okinawa.jp",
		"ishikari.hokkaido.jp",
		"ishikawa.fukushima.jp",
		"ishikawa.jp",
		"ishikawa.okinawa.jp",
		"ishinomaki.miyagi.jp",
		"isla.pr",
		"isshiki.aichi.jp",
		"isumi.chiba.jp",
		"it.ao",
		"it.bd",
		"it.kr",
		"itabashi.tokyo.jp",
		"itako.ibaraki.jp",
		"itakura.gunma.jp",
		"itami.hyogo.jp",
		"itano.tokushima.jp",
		"itayanagi.aomori.jp",
		"ito.shizuoka.jp",
		"itoigawa.niigata.jp",
		"itoman.okinawa.jp",
		"its.me",
		"ivano-frankivsk.ua",
		"iveland.no",
		"ivgu.no",
		"iwade.wakayama.jp",
		"iwafune.tochigi.jp",
		"iwaizumi.iwate.jp",
		"iwaki.fukushima.jp",
		"iwakuni.yamaguchi.jp",
		"iwakura.aichi.jp",
		"iwama.ibaraki.jp",
		"iwamizawa.hokkaido.jp",
		"iwanai.hokkaido.jp",
		"iwanuma.miyagi.jp",
		"iwata.shizuoka.jp",
		"iwate.iwate.jp",
		"iwate.jp",
		"iwatsuki.saitama.jp",
		"iwi.nz",
		"iyo.ehime.jp",
		"iz.hr",
		"izena.okinawa.jp",
		"izu.shizuoka.jp",
		"izumi.kagoshima.jp",
		"izumi.osaka.jp",
		"izumiotsu.osaka.jp",
		"izumisano.osaka.jp",
		"izumizaki.fukushima.jp",
		"izumo.shimane.jp",
		"izumozaki.niigata.jp",
		"izunokuni.shizuoka.jp",
		"j.bg",
		"jab.br",
		"jampa.br",
		"jan-mayen.no",
		"jaworzno.pl",
		"jdf.br",
		"jeju.kr",
		"jelenia-gora.pl",
		"jeonbuk.kr",
		"jeonnam.kr",
		"jessheim.no",
		"jevnaker.no",
		"jgora.pl",
		"jinsekikogen.hiroshima.jp",
		"jl.cn",
		"joboji.iwate.jp",
		"joetsu.niigata.jp",
		"jogasz.hu",
		"johana.toyama.jp",
		"joinville.br",
		"jolster.no",
		"jondal.no",
		"jor.br",
		"jorpeland.no",
		"joso.ibaraki.jp",
		"journal.aero",
		"journalist.aero",
		"joyo.kyoto.jp",
		"js.cn",
		"jur.pro",
		"jus.br",
		"jx.cn",
		"jølster.no",
		"jørpeland.no",
		"k.bg",
		"k.se",
		"k12.ak.us",
		"k12.al.us",
		"k12.ar.us",
		"k12.as.us",
		"k12.az.us",
		"k12.ca.us",
		"k12.co.us",
		"k12.ct.us",
		"k12.dc.us",
		"k12.ec",
		"k12.fl.us",
		"k12.ga.us",
		"k12.gu.us",
		"k12.ia.us",
		"k12.id.us",
		"k12.il",
		"k12.il.us",
		"k12.in.us",
		"k12.ks.us",
		"k12.ky.us",
		"k12.la.us",
		"k12.ma.us",
		"k12.md.us",
		"k12.me.us",
		"k12.mi.us",
		"k12.mn.us",
		"k12.mo.us",
		"k12.ms.us",
		"k12.mt.us",
		"k12.nc.us",
		"k12.ne.us",
		"k12.nh.us",
		"k12.nj.us",
		"k12.nm.us",
		"k12.nv.us",
		"k12.ny.us",
		"k12.oh.us",
		"k12.ok.us",
		"k12.or.us",
		"k12.pa.us",
		"k12.pr.us",
		"k12.sc.us",
		"k12.tn.us",
		"k12.tr",
		"k12.tx.us",
		"k12.ut.us",
		"k12.va.us",
		"k12.vi",
		"k12.vi.us",
		"k12.vt.us",
		"k12.wa.us",
		"k12.wi.us",
		"k12.wy.us",
		"kadena.okinawa.jp",
		"kadogawa.miyazaki.jp",
		"kadoma.osaka.jp",
		"kafjord.no",
		"kaga.ishikawa.jp",
		"kagami.kochi.jp",
		"kagamiishi.fukushima.jp",
		"kagamino.okayama.jp",
		"kagawa.jp",
		"kagoshima.jp",
		"kagoshima.kagoshima.jp",
		"kaho.fukuoka.jp",
		"kahoku.ishikawa.jp",
		"kahoku.yamagata.jp",
		"kai.yamanashi.jp",
		"kainan.tokushima.jp",
		"kainan.wakayama.jp",
		"kaisei.kanagawa.jp",
		"kaita.hiroshima.jp",
		"kaizuka.osaka.jp",
		"kakamigahara.gifu.jp",
		"kakegawa.shizuoka.jp",
		"kakinoki.shimane.jp",
		"kakogawa.hyogo.jp",
		"kakuda.miyagi.jp",
		"kalisz.pl",
		"kamagaya.chiba.jp",
		"kamaishi.iwate.jp",
		"kamakura.kanagawa.jp",
		"kameoka.kyoto.jp",
		"kameyama.mie.jp",
		"kami.kochi.jp",
		"kami.miyagi.jp",
		"kamiamakusa.kumamoto.jp",
		"kamifurano.hokkaido.jp",
		"kamigori.hyogo.jp",
		"kamiichi.toyama.jp",
		"kamiizumi.saitama.jp",
		"kamijima.ehime.jp",
		"kamikawa.hokkaido.jp",
		"kamikawa.hyogo.jp",
		"kamikawa.saitama.jp",
		"kamikitayama.nara.jp",
		"kamikoani.akita.jp",
		"kamimine.saga.jp",
		"kaminokawa.tochigi.jp",
		"kaminoyama.yamagata.jp",
		"kamioka.akita.jp",
		"kamisato.saitama.jp",
		"kamishihoro.hokkaido.jp",
		"kamisu.ibaraki.jp",
		"kamisunagawa.hokkaido.jp",
		"kamitonda.wakayama.jp",
		"kamitsue.oita.jp",
		"kamo.kyoto.jp",
		"kamo.niigata.jp",
		"kamoenai.hokkaido.jp",
		"kamogawa.chiba.jp",
		"kanagawa.jp",
		"kanan.osaka.jp",
		"kanazawa.ishikawa.jp",
		"kanegasaki.iwate.jp",
		"kaneyama.fukushima.jp",
		"kaneyama.yamagata.jp",
		"kani.gifu.jp",
		"kanie.aichi.jp",
		"kanmaki.nara.jp",
		"kanna.gunma.jp",
		"kannami.shizuoka.jp",
		"kanonji.kagawa.jp",
		"kanoya.kagoshima.jp",
		"kanra.gunma.jp",
		"kanuma.tochigi.jp",
		"kanzaki.saga.jp",
		"karasjohka.no",
		"karasjok.no",
		"karasuyama.tochigi.jp",
		"karatsu.saga.jp",
		"kariwa.niigata.jp",
		"kariya.aichi.jp",
		"karlsoy.no",
		"karlsøy.no",
		"karmoy.no",
		"karmøy.no",
		"karpacz.pl",
		"kartuzy.pl",
		"karuizawa.nagano.jp",
		"karumai.iwate.jp",
		"kasahara.gifu.jp",
		"kasai.hyogo.jp",
		"kasama.ibaraki.jp",
		"kasamatsu.gifu.jp",
		"kasaoka.okayama.jp",
		"kashiba.nara.jp",
		"kashihara.nara.jp",
		"kashima.ibaraki.jp",
		"kashima.saga.jp",
		"kashiwa.chiba.jp",
		"kashiwara.osaka.jp",
		"kashiwazaki.niigata.jp",
		"kasuga.fukuoka.jp",
		"kasuga.hyogo.jp",
		"kasugai.aichi.jp",
		"kasukabe.saitama.jp",
		"kasumigaura.ibaraki.jp",
		"kasuya.fukuoka.jp",
		"kaszuby.pl",
		"katagami.akita.jp",
		"katano.osaka.jp",
		"katashina.gunma.jp",
		"katori.chiba.jp",
		"katowice.pl",
		"katsuragi.nara.jp",
		"katsuragi.wakayama.jp",
		"katsushika.tokyo.jp",
		"katsuura.chiba.jp",
		"katsuyama.fukui.jp",
		"kautokeino.no",
		"kawaba.gunma.jp",
		"kawachinagano.osaka.jp",
		"kawagoe.mie.jp",
		"kawagoe.saitama.jp",
		"kawaguchi.saitama.jp",
		"kawahara.tottori.jp",
		"kawai.iwate.jp",
		"kawai.nara.jp",
		"kawajima.saitama.jp",
		"kawakami.nagano.jp",
		"kawakami.nara.jp",
		"kawakita.ishikawa.jp",
		"kawamata.fukushima.jp",
		"kawaminami.miyazaki.jp",
		"kawanabe.kagoshima.jp",
		"kawanehon.shizuoka.jp",
		"kawanishi.hyogo.jp",
		"kawanishi.nara.jp",
		"kawanishi.yamagata.jp",
		"kawara.fukuoka.jp",
		"kawasaki.jp",
		"kawasaki.miyagi.jp",
		"kawatana.nagasaki.jp",
		"kawaue.gifu.jp",
		"kawazu.shizuoka.jp",
		"kayabe.hokkaido.jp",
		"kazimierz-dolny.pl",
		"kazo.saitama.jp",
		"kazuno.akita.jp",
		"keisen.fukuoka.jp",
		"kembuchi.hokkaido.jp",
		"kep.tr",
		"kepno.pl",
		"ketrzyn.pl",
		"kg.kr",
		"kh.ua",
		"khanhhoa.vn",
		"kharkiv.ua",
		"kharkov.ua",
		"kherson.ua",
		"khmelnitskiy.ua",
		"khmelnytskyi.ua",
		"kibichuo.okayama.jp",
		"kiengiang.vn",
		"kiev.ua",
		"kiho.mie.jp",
		"kihoku.ehime.jp",
		"kijo.miyazaki.jp",
		"kikonai.hokkaido.jp",
		"kikuchi.kumamoto.jp",
		"kikugawa.shizuoka.jp",
		"kimino.wakayama.jp",
		"kimitsu.chiba.jp",
		"kimobetsu.hokkaido.jp",
		"kin.okinawa.jp",
		"kinko.kagoshima.jp",
		"kinokawa.wakayama.jp",
		"kira.aichi.jp",
		"kirkenes.no",
		"kirovograd.ua",
		"kiryu.gunma.jp",
		"kisarazu.chiba.jp",
		"kishiwada.osaka.jp",
		"kiso.nagano.jp",
		"kisofukushima.nagano.jp",
		"kisosaki.mie.jp",
		"kita.kyoto.jp",
		"kita.osaka.jp",
		"kita.tokyo.jp",
		"kitaaiki.nagano.jp",
		"kitaakita.akita.jp",
		"kitadaito.okinawa.jp",
		"kitagata.gifu.jp",
		"kitagata.saga.jp",
		"kitagawa.kochi.jp",
		"kitagawa.miyazaki.jp",
		"kitahata.saga.jp",
		"kitahiroshima.hokkaido.jp",
		"kitakami.iwate.jp",
		"kitakata.fukushima.jp",
		"kitakata.miyazaki.jp",
		"kitakyushu.jp",
		"kitami.hokkaido.jp",
		"kitamoto.saitama.jp",
		"kitanakagusuku.okinawa.jp",
		"kitashiobara.fukushima.jp",
		"kitaura.miyazaki.jp",
		"kitayama.wakayama.jp",
		"kiwa.mie.jp",
		"kiwi.nz",
		"kiyama.saga.jp",
		"kiyokawa.kanagawa.jp",
		"kiyosato.hokkaido.jp",
		"kiyose.tokyo.jp",
		"kiyosu.aichi.jp",
		"kizu.kyoto.jp",
		"klabu.no",
		"klepp.no",
		"klodzko.pl",
		"klæbu.no",
		"km.ua",
		"kmpsp.gov.pl",
		"kobayashi.miyazaki.jp",
		"kobe.jp",
		"kobierzyce.pl",
		"kochi.jp",
		"kochi.kochi.jp",
		"kodaira.tokyo.jp",
		"kofu.yamanashi.jp",
		"koga.fukuoka.jp",
		"koga.ibaraki.jp",
		"koganei.tokyo.jp",
		"koge.tottori.jp",
		"koka.shiga.jp",
		"kokonoe.oita.jp",
		"kokubunji.tokyo.jp",
		"kolobrzeg.pl",
		"komae.tokyo.jp",
		"komagane.nagano.jp",
		"komaki.aichi.jp",
		"komatsu.ishikawa.jp",
		"komatsushima.tokushima.jp",
		"komforb.se",
		"kommunalforbund.se",
		"kommune.no",
		"komono.mie.jp",
		"komoro.nagano.jp",
		"komvux.se",
		"konan.aichi.jp",
		"konan.shiga.jp",
		"kongsberg.no",
		"kongsvinger.no",
		"konin.pl",
		"konskowola.pl",
		"konsulat.gov.pl",
		"kontum.vn",
		"konyvelo.hu",
		"koori.fukushima.jp",
		"kop.id",
		"kopervik.no",
		"koriyama.fukushima.jp",
		"koryo.nara.jp",
		"kosai.shizuoka.jp",
		"kosaka.akita.jp",
		"kosei.shiga.jp",
		"koshigaya.saitama.jp",
		"koshimizu.hokkaido.jp",
		"koshu.yamanashi.jp",
		"kosuge.yamanashi.jp",
		"kota.aichi.jp",
		"koto.shiga.jp",
		"koto.tokyo.jp",
		"kotohira.kagawa.jp",
		"kotoura.tottori.jp",
		"kouhoku.saga.jp",
		"kounosu.saitama.jp",
		"kouyama.kagoshima.jp",
		"kouzushima.tokyo.jp",
		"koya.wakayama.jp",
		"koza.wakayama.jp",
		"kozagawa.wakayama.jp",
		"kozaki.chiba.jp",
		"kppsp.gov.pl",
		"kr.it",
		"kr.ua",
		"kraanghke.no",
		"kragero.no",
		"kragerø.no",
		"kristiansand.no",
		"kristiansund.no",
		"krodsherad.no",
		"krokstadelva.no",
		"kropyvnytskyi.ua",
		"krym.ua",
		"kråanghke.no",
		"krødsherad.no",
		"ks.ua",
		"ks.us",
		"kuchinotsu.nagasaki.jp",
		"kudamatsu.yamaguchi.jp",
		"kudoyama.wakayama.jp",
		"kui.hiroshima.jp",
		"kuji.iwate.jp",
		"kuju.oita.jp",
		"kujukuri.chiba.jp",
		"kuki.saitama.jp",
		"kumagaya.saitama.jp",
		"kumakogen.ehime.jp",
		"kumamoto.jp",
		"kumamoto.kumamoto.jp",
		"kumano.hiroshima.jp",
		"kumano.mie.jp",
		"kumatori.osaka.jp",
		"kumejima.okinawa.jp",
		"kumenan.okayama.jp",
		"kumiyama.kyoto.jp",
		"kunigami.okinawa.jp",
		"kunimi.fukushima.jp",
		"kunisaki.oita.jp",
		"kunitachi.tokyo.jp",
		"kunitomi.miyazaki.jp",
		"kunneppu.hokkaido.jp",
		"kunohe.iwate.jp",
		"kurashiki.okayama.jp",
		"kurate.fukuoka.jp",
		"kure.hiroshima.jp",
		"kuriyama.hokkaido.jp",
		"kurobe.toyama.jp",
		"kurogi.fukuoka.jp",
		"kuroishi.aomori.jp",
		"kuroiso.tochigi.jp",
		"kuromatsunai.hokkaido.jp",
		"kurotaki.nara.jp",
		"kurume.fukuoka.jp",
		"kusatsu.gunma.jp",
		"kusatsu.shiga.jp",
		"kushima.miyazaki.jp",
		"kushimoto.wakayama.jp",
		"kushiro.hokkaido.jp",
		"kusu.oita.jp",
		"kutchan.hokkaido.jp",
		"kutno.pl",
		"kuwana.mie.jp",
		"kuzumaki.iwate.jp",
		"kv.ua",
		"kvafjord.no",
		"kvalsund.no",
		"kvam.no",
		"kvanangen.no",
		"kvinesdal.no",
		"kvinnherad.no",
		"kviteseid.no",
		"kvitsoy.no",
		"kvitsøy.no",
		"kvæfjord.no",
		"kvænangen.no",
		"kwp.gov.pl",
		"kwpsp.gov.pl",
		"ky.us",
		"kyiv.ua",
		"kyonan.chiba.jp",
		"kyotamba.kyoto.jp",
		"kyotanabe.kyoto.jp",
		"kyotango.kyoto.jp",
		"kyoto.jp",
		"kyowa.akita.jp",
		"kyowa.hokkaido.jp",
		"kyuragi.saga.jp",
		"kárášjohka.no",
		"kåfjord.no",
		"l.bg",
		"l.se",
		"la-spezia.it",
		"la.us",
		"laakesvuemie.no",
		"lahppi.no",
		"laichau.vn",
		"lakas.hu",
		"lamdong.vn",
		"lanbib.se",
		"langevag.no",
		"langevåg.no",
		"langson.vn",
		"laocai.vn",
		"lapy.pl",
		"laquila.it",
		"lardal.no",
		"larvik.no",
		"laspezia.it",
		"lat.ec",
		"latina.it",
		"lavagis.no",
		"lavangen.no",
		"law.pro",
		"law.za",
		"laz.it",
		"lazio.it",
		"lc.it",
		"le.it",
		"leangaviika.no",
		"leasing.aero",
		"leaŋgaviika.no",
		"lebesby.no",
		"lebork.pl",
		"lecce.it",
		"lecco.it",
		"leg.br",
		"legnica.pl",
		"leikanger.no",
		"leilao.br",
		"leirfjord.no",
		"leirvik.no",
		"leka.no",
		"leksvik.no",
		"lel.br",
		"lenvik.no",
		"lerdal.no",
		"lesja.no",
		"levanger.no",
		"lezajsk.pl",
		"lg.jp",
		"lg.ua",
		"li.it",
		"lib.ak.us",
		"lib.al.us",
		"lib.ar.us",
		"lib.as.us",
		"lib.az.us",
		"lib.ca.us",
		"lib.co.us",
		"lib.ct.us",
		"lib.dc.us",
		"lib.ee",
		"lib.fl.us",
		"lib.ga.us",
		"lib.gu.us",
		"lib.hi.us",
		"lib.ia.us",
		"lib.id.us",
		"lib.il.us",
		"lib.in.us",
		"lib.ks.us",
		"lib.ky.us",
		"lib.la.us",
		"lib.ma.us",
		"lib.md.us",
		"lib.me.us",
		"lib.mi.us",
		"lib.mn.us",
		"lib.mo.us",
		"lib.mt.us",
		"lib.nc.us",
		"lib.ne.us",
		"lib.nh.us",
		"lib.nj.us",
		"lib.nm.us",
		"lib.nv.us",
		"lib.ny.us",
		"lib.oh.us",
		"lib.ok.us",
		"lib.or.us",
		"lib.pa.us",
		"lib.pr.us",
		"lib.ri.us",
		"lib.sc.us",
		"lib.sd.us",
		"lib.tn.us",
		"lib.tx.us",
		"lib.ut.us",
		"lib.va.us",
		"lib.vi.us",
		"lib.vt.us",
		"lib.wa.us",
		"lib.wi.us",
		"lib.wy.us",
		"lier.no",
		"lierne.no",
		"lig.it",
		"liguria.it",
		"lillehammer.no",
		"lillesand.no",
		"limanowa.pl",
		"lindas.no",
		"lindesnes.no",
		"lindås.no",
		"livorno.it",
		"llc.ge",
		"ln.cn",
		"lo.it",
		"loabat.no",
		"loabát.no",
		"lodi.it",
		"lodingen.no",
		"log.br",
		"logistics.aero",
		"loisirs.bj",
		"loj.ec",
		"lom.it",
		"lom.no",
		"lombardia.it",
		"lombardy.it",
		"lomza.pl",
		"londrina.br",
		"longan.vn",
		"loppa.no",
		"lorenskog.no",
		"loten.no",
		"lowicz.pl",
		"lt.it",
		"lt.ua",
		"ltd.co.im",
		"ltd.cy",
		"ltd.gi",
		"ltd.lk",
		"ltd.uk",
		"lu.it",
		"lubin.pl",
		"lucania.it",
		"lucca.it",
		"lugansk.ua",
		"luhansk.ua",
		"lukow.pl",
		"lund.no",
		"lunner.no",
		"luroy.no",
		"lurøy.no",
		"luster.no",
		"lutsk.ua",
		"lv.ua",
		"lviv.ua",
		"lyngdal.no",
		"lyngen.no",
		"láhppi.no",
		"lærdal.no",
		"lødingen.no",
		"lørenskog.no",
		"løten.no",
		"m.bg",
		"m.se",
		"ma.gov.br",
		"ma.us",
		"macapa.br",
		"maceio.br",
		"macerata.it",
		"machida.tokyo.jp",
		"maebashi.gunma.jp",
		"magazine.aero",
		"maibara.shiga.jp",
		"mail.pl",
		"maintenance.aero",
		"maizuru.kyoto.jp",
		"makinohara.shizuoka.jp",
		"makurazaki.kagoshima.jp",
		"malatvuopmi.no",
		"malbork.pl",
		"malopolska.pl",
		"malselv.no",
		"malvik.no",
		"mamurogawa.yamagata.jp",
		"manaus.br",
		"mandal.no",
		"maniwa.okayama.jp",
		"manno.kagawa.jp",
		"mantova.it",
		"maori.nz",
		"mar.it",
		"marche.it",
		"maringa.br",
		"marker.no",
		"marketplace.aero",
		"marnardal.no",
		"marugame.kagawa.jp",
		"marumori.miyagi.jp",
		"masaki.ehime.jp",
		"masfjorden.no",
		"mashike.hokkaido.jp",
		"mashiki.kumamoto.jp",
		"mashiko.tochigi.jp",
		"masoy.no",
		"massa-carrara.it",
		"massacarrara.it",
		"masuda.shimane.jp",
		"mat.br",
		"matera.it",
		"matsubara.osaka.jp",
		"matsubushi.saitama.jp",
		"matsuda.kanagawa.jp",
		"matsudo.chiba.jp",
		"matsue.shimane.jp",
		"matsukawa.nagano.jp",
		"matsumae.hokkaido.jp",
		"matsumoto.kagoshima.jp",
		"matsumoto.nagano.jp",
		"matsuno.ehime.jp",
		"matsusaka.mie.jp",
		"matsushige.tokushima.jp",
		"matsushima.miyagi.jp",
		"matsuura.nagasaki.jp",
		"matsuyama.ehime.jp",
		"matsuzaki.shizuoka.jp",
		"matta-varjjat.no",
		"mazowsze.pl",
		"mazury.pl",
		"mb.ca",
		"mb.it",
		"mc.it",
		"md.us",
		"me.eg",
		"me.in",
		"me.it",
		"me.ke",
		"me.kr",
		"me.so",
		"me.ss",
		"me.tz",
		"me.uk",
		"me.us",
		"med.br",
		"med.ec",
		"med.ee",
		"med.ht",
		"med.ly",
		"med.om",
		"med.pa",
		"med.pro",
		"med.sa",
		"med.sd",
		"medecin.km",
		"media.aero",
		"media.hu",
		"media.pl",
		"medicina.bo",
		"medio-campidano.it",
		"mediocampidano.it",
		"meguro.tokyo.jp",
		"meiwa.gunma.jp",
		"meiwa.mie.jp",
		"meland.no",
		"meldal.no",
		"melhus.no",
		"meloy.no",
		"meløy.no",
		"meraker.no",
		"meråker.no",
		"messina.it",
		"mg.gov.br",
		"mi.it",
		"mi.th",
		"mi.us",
		"miasa.nagano.jp",
		"miasta.pl",
		"mibu.tochigi.jp",
		"microlight.aero",
		"midori.chiba.jp",
		"midori.gunma.jp",
		"midsund.no",
		"midtre-gauldal.no",
		"mie.jp",
		"mielec.pl",
		"mielno.pl",
		"mifune.kumamoto.jp",
		"mihama.aichi.jp",
		"mihama.chiba.jp",
		"mihama.fukui.jp",
		"mihama.mie.jp",
		"mihama.wakayama.jp",
		"mihara.hiroshima.jp",
		"mihara.kochi.jp",
		"miharu.fukushima.jp",
		"miho.ibaraki.jp",
		"mikasa.hokkaido.jp",
		"mikawa.yamagata.jp",
		"miki.hyogo.jp",
		"mil.ac",
		"mil.ae",
		"mil.al",
		"mil.ar",
		"mil.az",
		"mil.ba",
		"mil.bd",
		"mil.bo",
		"mil.br",
		"mil.by",
		"mil.cl",
		"mil.cn",
		"mil.co",
		"mil.cy",
		"mil.do",
		"mil.ec",
		"mil.eg",
		"mil.fj",
		"mil.gh",
		"mil.gt",
		"mil.hn",
		"mil.id",
		"mil.in",
		"mil.io",
		"mil.iq",
		"mil.jo",
		"mil.kg",
		"mil.km",
		"mil.kr",
		"mil.kz",
		"mil.lv",
		"mil.mg",
		"mil.mv",
		"mil.my",
		"mil.mz",
		"mil.ng",
		"mil.ni",
		"mil.no",
		"mil.nz",
		"mil.pe",
		"mil.ph",
		"mil.pl",
		"mil.py",
		"mil.qa",
		"mil.rw",
		"mil.sh",
		"mil.st",
		"mil.sy",
		"mil.tj",
		"mil.tm",
		"mil.to",
		"mil.tr",
		"mil.tt",
		"mil.tw",
		"mil.tz",
		"mil.ug",
		"mil.uy",
		"mil.vc",
		"mil.ve",
		"mil.ye",
		"mil.za",
		"mil.zm",
		"mil.zw",
		"milan.it",
		"milano.it",
		"mima.tokushima.jp",
		"mimata.miyazaki.jp",
		"minakami.gunma.jp",
		"minamata.kumamoto.jp",
		"minami-alps.yamanashi.jp",
		"minami.fukuoka.jp",
		"minami.kyoto.jp",
		"minami.tokushima.jp",
		"minamiaiki.nagano.jp",
		"minamiashigara.kanagawa.jp",
		"minamiawaji.hyogo.jp",
		"minamiboso.chiba.jp",
		"minamidaito.okinawa.jp",
		"minamiechizen.fukui.jp",
		"minamifurano.hokkaido.jp",
		"minamiise.mie.jp",
		"minamiizu.shizuoka.jp",
		"minamimaki.nagano.jp",
		"minamiminowa.nagano.jp",
		"minamioguni.kumamoto.jp",
		"minamisanriku.miyagi.jp",
		"minamitane.kagoshima.jp",
		"minamiuonuma.niigata.jp",
		"minamiyamashiro.kyoto.jp",
		"minano.saitama.jp",
		"minato.osaka.jp",
		"minato.tokyo.jp",
		"mincom.tn",
		"mino.gifu.jp",
		"minobu.yamanashi.jp",
		"minoh.osaka.jp",
		"minokamo.gifu.jp",
		"minowa.nagano.jp",
		"misaki.okayama.jp",
		"misaki.osaka.jp",
		"misasa.tottori.jp",
		"misato.akita.jp",
		"misato.miyagi.jp",
		"misato.saitama.jp",
		"misato.shimane.jp",
		"misato.wakayama.jp",
		"misawa.aomori.jp",
		"mishima.fukushima.jp",
		"mishima.shizuoka.jp",
		"misugi.mie.jp",
		"mitaka.tokyo.jp",
		"mitake.gifu.jp",
		"mitane.akita.jp",
		"mito.ibaraki.jp",
		"mitou.yamaguchi.jp",
		"mitoyo.kagawa.jp",
		"mitsue.nara.jp",
		"mitsuke.niigata.jp",
		"miura.kanagawa.jp",
		"miyada.nagano.jp",
		"miyagi.jp",
		"miyake.nara.jp",
		"miyako.fukuoka.jp",
		"miyako.iwate.jp",
		"miyakonojo.miyazaki.jp",
		"miyama.fukuoka.jp",
		"miyama.mie.jp",
		"miyashiro.saitama.jp",
		"miyawaka.fukuoka.jp",
		"miyazaki.jp",
		"miyazaki.miyazaki.jp",
		"miyazu.kyoto.jp",
		"miyoshi.aichi.jp",
		"miyoshi.hiroshima.jp",
		"miyoshi.saitama.jp",
		"miyoshi.tokushima.jp",
		"miyota.nagano.jp",
		"mizuho.tokyo.jp",
		"mizumaki.fukuoka.jp",
		"mizunami.gifu.jp",
		"mizusawa.iwate.jp",
		"mjondalen.no",
		"mjøndalen.no",
		"mk.ua",
		"mktg.ec",
		"mn.it",
		"mn.us",
		"mo-i-rana.no",
		"mo.cn",
		"mo.it",
		"mo.us",
		"moareke.no",
		"mobara.chiba.jp",
		"mobi.gp",
		"mobi.ke",
		"mobi.ng",
		"mobi.tz",
		"mochizuki.nagano.jp",
		"mod.gi",
		"modalen.no",
		"modelling.aero",
		"modena.it",
		"modum.no",
		"moka.tochigi.jp",
		"mol.it",
		"molde.no",
		"molise.it",
		"mombetsu.hokkaido.jp",
		"mon.ec",
		"money.bj",
		"monza-brianza.it",
		"monza-e-della-brianza.it",
		"monza.it",
		"monzabrianza.it",
		"monzaebrianza.it",
		"monzaedellabrianza.it",
		"morena.br",
		"moriguchi.osaka.jp",
		"morimachi.shizuoka.jp",
		"morioka.iwate.jp",
		"moriya.ibaraki.jp",
		"moriyama.shiga.jp",
		"moriyoshi.akita.jp",
		"morotsuka.miyazaki.jp",
		"moroyama.saitama.jp",
		"moseushi.hokkaido.jp",
		"mosjoen.no",
		"mosjøen.no",
		"moskenes.no",
		"moss.no",
		"motegi.tochigi.jp",
		"motobu.okinawa.jp",
		"motosu.gifu.jp",
		"motoyama.kochi.jp",
		"movimiento.bo",
		"moåreke.no",
		"mp.br",
		"mr.no",
		"mragowo.pl",
		"ms.gov.br",
		"ms.it",
		"ms.kr",
		"ms.us",
		"mt.gov.br",
		"mt.it",
		"mt.us",
		"mugi.tokushima.jp",
		"muika.niigata.jp",
		"mukawa.hokkaido.jp",
		"muko.kyoto.jp",
		"munakata.fukuoka.jp",
		"muni.il",
		"muosat.no",
		"muosát.no",
		"mup.gov.pl",
		"murakami.niigata.jp",
		"murata.miyagi.jp",
		"murayama.yamagata.jp",
		"muroran.hokkaido.jp",
		"muroto.kochi.jp",
		"mus.br",
		"mus.mi.us",
		"musashimurayama.tokyo.jp",
		"musashino.tokyo.jp",
		"museum.mv",
		"museum.no",
		"museum.om",
		"musica.ar",
		"musica.bo",
		"mutsu.aomori.jp",
		"mutsuzawa.chiba.jp",
		"mutual.ar",
		"mw.gov.pl",
		"my.id",
		"mykolaiv.ua",
		"myoko.niigata.jp",
		"málatvuopmi.no",
		"mátta-várjjat.no",
		"målselv.no",
		"måsøy.no",
		"māori.nz",
		"n.bg",
		"n.se",
		"na.it",
		"naamesjevuemie.no",
		"nabari.mie.jp",
		"nachikatsuura.wakayama.jp",
		"nagahama.shiga.jp",
		"nagai.yamagata.jp",
		"nagano.jp",
		"nagano.nagano.jp",
		"naganohara.gunma.jp",
		"nagaoka.niigata.jp",
		"nagaokakyo.kyoto.jp",
		"nagara.chiba.jp",
		"nagareyama.chiba.jp",
		"nagasaki.jp",
		"nagasaki.nagasaki.jp",
		"nagasu.kumamoto.jp",
		"nagato.yamaguchi.jp",
		"nagatoro.saitama.jp",
		"nagawa.nagano.jp",
		"nagi.okayama.jp",
		"nagiso.nagano.jp",
		"nago.okinawa.jp",
		"nagoya.jp",
		"naha.okinawa.jp",
		"nahari.kochi.jp",
		"naie.hokkaido.jp",
		"naka.hiroshima.jp",
		"naka.ibaraki.jp",
		"nakadomari.aomori.jp",
		"nakagawa.fukuoka.jp",
		"nakagawa.hokkaido.jp",
		"nakagawa.nagano.jp",
		"nakagawa.tokushima.jp",
		"nakagusuku.okinawa.jp",
		"nakagyo.kyoto.jp",
		"nakai.kanagawa.jp",
		"nakama.fukuoka.jp",
		"nakamichi.yamanashi.jp",
		"nakamura.kochi.jp",
		"nakaniikawa.toyama.jp",
		"nakano.nagano.jp",
		"nakano.tokyo.jp",
		"nakanojo.gunma.jp",
		"nakanoto.ishikawa.jp",
		"nakasatsunai.hokkaido.jp",
		"nakatane.kagoshima.jp",
		"nakatombetsu.hokkaido.jp",
		"nakatsugawa.gifu.jp",
		"nakayama.yamagata.jp",
		"nakijin.okinawa.jp",
		"naklo.pl",
		"namdalseid.no",
		"namdinh.vn",
		"name.az",
		"name.eg",
		"name.et",
		"name.fj",
		"name.hr",
		"name.mk",
		"name.mv",
		"name.my",
		"name.ng",
		"name.pr",
		"name.qa",
		"name.tj",
		"name.tr",
		"name.tt",
		"name.vn",
		"namegata.ibaraki.jp",
		"namegawa.saitama.jp",
		"namerikawa.toyama.jp",
		"namie.fukushima.jp",
		"namikata.ehime.jp",
		"namsos.no",
		"namsskogan.no",
		"nanae.hokkaido.jp",
		"nanao.ishikawa.jp",
		"nanbu.tottori.jp",
		"nanbu.yamanashi.jp",
		"nango.fukushima.jp",
		"nanjo.okinawa.jp",
		"nankoku.kochi.jp",
		"nanmoku.gunma.jp",
		"nannestad.no",
		"nanporo.hokkaido.jp",
		"nantan.kyoto.jp",
		"nanto.toyama.jp",
		"nanyo.yamagata.jp",
		"naoshima.kagawa.jp",
		"naples.it",
		"napoli.it",
		"nara.jp",
		"nara.nara.jp",
		"narashino.chiba.jp",
		"narita.chiba.jp",
		"naroy.no",
		"narusawa.yamanashi.jp",
		"naruto.tokushima.jp",
		"narviika.no",
		"narvik.no",
		"nasu.tochigi.jp",
		"nasushiobara.tochigi.jp",
		"nat.cu",
		"nat.tn",
		"natal.br",
		"natori.miyagi.jp",
		"natural.bo",
		"naturbruksgymn.se",
		"naustdal.no",
		"navigation.aero",
		"navuotna.no",
		"nayoro.hokkaido.jp",
		"nb.ca",
		"nc.tr",
		"nc.us",
		"nd.us",
		"ne.jp",
		"ne.ke",
		"ne.kr",
		"ne.tz",
		"ne.ug",
		"ne.us",
		"nedre-eiker.no",
		"nemuro.hokkaido.jp",
		"nerima.tokyo.jp",
		"nes.akershus.no",
		"nes.buskerud.no",
		"nesna.no",
		"nesodden.no",
		"nesoddtangen.no",
		"nesseby.no",
		"nesset.no",
		"net.ac",
		"net.ae",
		"net.af",
		"net.ag",
		"net.ai",
		"net.al",
		"net.am",
		"net.ar",
		"net.au",
		"net.az",
		"net.ba",
		"net.bb",
		"net.bd",
		"net.bh",
		"net.bj",
		"net.bm",
		"net.bn",
		"net.bo",
		"net.br",
		"net.bs",
		"net.bt",
		"net.bw",
		"net.bz",
		"net.ci",
		"net.cm",
		"net.cn",
		"net.co",
		"net.cu",
		"net.cv",
		"net.cw",
		"net.cy",
		"net.dm",
		"net.do",
		"net.dz",
		"net.ec",
		"net.eg",
		"net.et",
		"net.fj",
		"net.fm",
		"net.ge",
		"net.gg",
		"net.gh",
		"net.gl",
		"net.gn",
		"net.gp",
		"net.gr",
		"net.gt",
		"net.gu",
		"net.gy",
		"net.hk",
		"net.hn",
		"net.ht",
		"net.id",
		"net.il",
		"net.im",
		"net.in",
		"net.io",
		"net.iq",
		"net.ir",
		"net.je",
		"net.jo",
		"net.kg",
		"net.kh",
		"net.ki",
		"net.kn",
		"net.kw",
		"net.ky",
		"net.kz",
		"net.la",
		"net.lb",
		"net.lc",
		"net.lk",
		"net.lr",
		"net.ls",
		"net.lv",
		"net.ly",
		"net.ma",
		"net.me",
		"net.mk",
		"net.ml",
		"net.mo",
		"net.ms",
		"net.mt",
		"net.mu",
		"net.mv",
		"net.mw",
		"net.mx",
		"net.my",
		"net.mz",
		"net.na",
		"net.nf",
		"net.ng",
		"net.ni",
		"net.nr",
		"net.nz",
		"net.om",
		"net.pa",
		"net.pe",
		"net.ph",
		"net.pk",
		"net.pl",
		"net.pn",
		"net.pr",
		"net.ps",
		"net.pt",
		"net.py",
		"net.qa",
		"net.rw",
		"net.sa",
		"net.sb",
		"net.sc",
		"net.sd",
		"net.sg",
		"net.sh",
		"net.sl",
		"net.so",
		"net.ss",
		"net.st",
		"net.sy",
		"net.th",
		"net.tj",
		"net.tm",
		"net.tn",
		"net.to",
		"net.tr",
		"net.tt",
		"net.tw",
		"net.ua",
		"net.uk",
		"net.uy",
		"net.uz",
		"net.vc",
		"net.ve",
		"net.vi",
		"net.vn",
		"net.vu",
		"net.ws",
		"net.ye",
		"net.za",
		"net.zm",
		"news.hu",
		"neyagawa.osaka.jp",
		"nf.ca",
		"nghean.vn",
		"ngo.lk",
		"ngo.ph",
		"ngo.za",
		"nh.us",
		"nhs.uk",
		"nic.in",
		"nic.tj",
		"nic.za",
		"nichinan.miyazaki.jp",
		"nichinan.tottori.jp",
		"nieruchomosci.pl",
		"niigata.jp",
		"niigata.niigata.jp",
		"niihama.ehime.jp",
		"niikappu.hokkaido.jp",
		"niimi.okayama.jp",
		"niiza.saitama.jp",
		"nikaho.akita.jp",
		"niki.hokkaido.jp",
		"nikko.tochigi.jp",
		"nikolaev.ua",
		"ninhbinh.vn",
		"ninhthuan.vn",
		"ninohe.iwate.jp",
		"ninomiya.kanagawa.jp",
		"nirasaki.yamanashi.jp",
		"nis.za",
		"nishi.fukuoka.jp",
		"nishi.osaka.jp",
		"nishiaizu.fukushima.jp",
		"nishiarita.saga.jp",
		"nishiawakura.okayama.jp",
		"nishiazai.shiga.jp",
		"nishigo.fukushima.jp",
		"nishihara.kumamoto.jp",
		"nishihara.okinawa.jp",
		"nishiizu.shizuoka.jp",
		"nishikata.tochigi.jp",
		"nishikatsura.yamanashi.jp",
		"nishikawa.yamagata.jp",
		"nishimera.miyazaki.jp",
		"nishinomiya.hyogo.jp",
		"nishinoomote.kagoshima.jp",
		"nishinoshima.shimane.jp",
		"nishio.aichi.jp",
		"nishiokoppe.hokkaido.jp",
		"nishitosa.kochi.jp",
		"nishiwaki.hyogo.jp",
		"nissedal.no",
		"nisshin.aichi.jp",
		"niteroi.br",
		"nittedal.no",
		"niyodogawa.kochi.jp",
		"nj.us",
		"nl.ca",
		"nl.no",
		"nm.cn",
		"nm.us",
		"no.it",
		"nobeoka.miyazaki.jp",
		"noboribetsu.hokkaido.jp",
		"noda.chiba.jp",
		"noda.iwate.jp",
		"nogata.fukuoka.jp",
		"nogi.tochigi.jp",
		"noheji.aomori.jp",
		"nom.ag",
		"nom.br",
		"nom.co",
		"nom.es",
		"nom.fr",
		"nom.io",
		"nom.km",
		"nom.mg",
		"nom.nc",
		"nom.ni",
		"nom.pa",
		"nom.pe",
		"nom.pl",
		"nom.ro",
		"nom.tm",
		"nom.ve",
		"nom.za",
		"nombre.bo",
		"nome.cv",
		"nome.pt",
		"nomi.ishikawa.jp",
		"nonoichi.ishikawa.jp",
		"nord-aurdal.no",
		"nord-fron.no",
		"nord-odal.no",
		"norddal.no",
		"nordkapp.no",
		"nordre-land.no",
		"nordreisa.no",
		"nore-og-uvdal.no",
		"nose.osaka.jp",
		"nosegawa.nara.jp",
		"noshiro.akita.jp",
		"not.br",
		"notaires.km",
		"noticias.bo",
		"noto.ishikawa.jp",
		"notodden.no",
		"notogawa.shiga.jp",
		"notteroy.no",
		"novara.it",
		"nowaruda.pl",
		"nozawaonsen.nagano.jp",
		"ns.ca",
		"nsn.us",
		"nsw.au",
		"nsw.edu.au",
		"nt.au",
		"nt.ca",
		"nt.edu.au",
		"nt.no",
		"nt.ro",
		"ntr.br",
		"ntr.ec",
		"nu.ca",
		"nu.it",
		"numata.gunma.jp",
		"numata.hokkaido.jp",
		"numazu.shizuoka.jp",
		"nuoro.it",
		"nv.us",
		"nx.cn",
		"ny.us",
		"nysa.pl",
		"nyuzen.toyama.jp",
		"návuotna.no",
		"nååmesjevuemie.no",
		"nærøy.no",
		"nøtterøy.no",
		"o.bg",
		"o.se",
		"oamishirasato.chiba.jp",
		"oarai.ibaraki.jp",
		"obama.fukui.jp",
		"obama.nagasaki.jp",
		"obanazawa.yamagata.jp",
		"obihiro.hokkaido.jp",
		"obira.hokkaido.jp",
		"obu.aichi.jp",
		"obuse.nagano.jp",
		"ochi.kochi.jp",
		"od.ua",
		"odate.akita.jp",
		"odawara.kanagawa.jp",
		"odda.no",
		"odesa.ua",
		"odessa.ua",
		"odo.br",
		"odont.ec",
		"oe.yamagata.jp",
		"of.by",
		"of.no",
		"off.ai",
		"ofunato.iwate.jp",
		"og.ao",
		"og.it",
		"oga.akita.jp",
		"ogaki.gifu.jp",
		"ogano.saitama.jp",
		"ogasawara.tokyo.jp",
		"ogata.akita.jp",
		"ogawa.ibaraki.jp",
		"ogawa.nagano.jp",
		"ogawa.saitama.jp",
		"ogawara.miyagi.jp",
		"ogi.saga.jp",
		"ogimi.okinawa.jp",
		"ogliastra.it",
		"ogori.fukuoka.jp",
		"ogose.saitama.jp",
		"oguchi.aichi.jp",
		"oguni.kumamoto.jp",
		"oguni.yamagata.jp",
		"oh.us",
		"oharu.aichi.jp",
		"ohda.shimane.jp",
		"ohi.fukui.jp",
		"ohira.miyagi.jp",
		"ohira.tochigi.jp",
		"ohkura.yamagata.jp",
		"ohtawara.tochigi.jp",
		"oi.kanagawa.jp",
		"oia.gov.pl",
		"oirase.aomori.jp",
		"oirm.gov.pl",
		"oishida.yamagata.jp",
		"oiso.kanagawa.jp",
		"oita.jp",
		"oita.oita.jp",
		"oizumi.gunma.jp",
		"oji.nara.jp",
		"ojiya.niigata.jp",
		"ok.us",
		"okagaki.fukuoka.jp",
		"okawa.fukuoka.jp",
		"okawa.kochi.jp",
		"okaya.nagano.jp",
		"okayama.jp",
		"okayama.okayama.jp",
		"okazaki.aichi.jp",
		"oke.gov.pl",
		"okegawa.saitama.jp",
		"oketo.hokkaido.jp",
		"oki.fukuoka.jp",
		"okinawa.jp",
		"okinawa.okinawa.jp",
		"okinoshima.shimane.jp",
		"okoppe.hokkaido.jp",
		"oksnes.no",
		"okuizumo.shimane.jp",
		"okuma.fukushima.jp",
		"okutama.tokyo.jp",
		"ol.no",
		"olawa.pl",
		"olbia-tempio.it",
		"olbiatempio.it",
		"olecko.pl",
		"olkusz.pl",
		"olsztyn.pl",
		"omachi.nagano.jp",
		"omachi.saga.jp",
		"omaezaki.shizuoka.jp",
		"omasvuotna.no",
		"ome.tokyo.jp",
		"omi.nagano.jp",
		"omi.niigata.jp",
		"omigawa.chiba.jp",
		"omihachiman.shiga.jp",
		"omitama.ibaraki.jp",
		"omiya.saitama.jp",
		"omotego.fukushima.jp",
		"omura.nagasaki.jp",
		"omuta.fukuoka.jp",
		"on.ca",
		"onagawa.miyagi.jp",
		"ong.br",
		"onga.fukuoka.jp",
		"onjuku.chiba.jp",
		"online.ge",
		"onna.okinawa.jp",
		"ono.fukui.jp",
		"ono.fukushima.jp",
		"ono.hyogo.jp",
		"onojo.fukuoka.jp",
		"onomichi.hiroshima.jp",
		"ookuwa.nagano.jp",
		"ooshika.nagano.jp",
		"oow.gov.pl",
		"opoczno.pl",
		"opole.pl",
		"oppdal.no",
		"oppegard.no",
		"oppegård.no",
		"or.at",
		"or.bi",
		"or.ci",
		"or.cr",
		"or.id",
		"or.it",
		"or.jp",
		"or.ke",
		"or.kr",
		"or.mu",
		"or.th",
		"or.tz",
		"or.ug",
		"or.us",
		"ora.gunma.jp",
		"org.ac",
		"org.ae",
		"org.af",
		"org.ag",
		"org.ai",
		"org.al",
		"org.am",
		"org.ao",
		"org.ar",
		"org.au",
		"org.az",
		"org.ba",
		"org.bb",
		"org.bd",
		"org.bh",
		"org.bi",
		"org.bj",
		"org.bm",
		"org.bn",
		"org.bo",
		"org.br",
		"org.bs",
		"org.bt",
		"org.bw",
		"org.bz",
		"org.ci",
		"org.cn",
		"org.co",
		"org.cu",
		"org.cv",
		"org.cw",
		"org.cy",
		"org.dm",
		"org.do",
		"org.dz",
		"org.ec",
		"org.ee",
		"org.eg",
		"org.es",
		"org.et",
		"org.fj",
		"org.fm",
		"org.ge",
		"org.gg",
		"org.gh",
		"org.gi",
		"org.gl",
		"org.gn",
		"org.gp",
		"org.gr",
		"org.gt",
		"org.gu",
		"org.gy",
		"org.hk",
		"org.hn",
		"org.ht",
		"org.hu",
		"org.il",
		"org.im",
		"org.in",
		"org.io",
		"org.iq",
		"org.ir",
		"org.je",
		"org.jo",
		"org.kg",
		"org.kh",
		"org.ki",
		"org.km",
		"org.kn",
		"org.kp",
		"org.kw",
		"org.ky",
		"org.kz",
		"org.la",
		"org.lb",
		"org.lc",
		"org.lk",
		"org.lr",
		"org.ls",
		"org.lv",
		"org.ly",
		"org.ma",
		"org.me",
		"org.mg",
		"org.mk",
		"org.ml",
		"org.mn",
		"org.mo",
		"org.ms",
		"org.mt",
		"org.mu",
		"org.mv",
		"org.mw",
		"org.mx",
		"org.my",
		"org.mz",
		"org.na",
		"org.ng",
		"org.ni",
		"org.nr",
		"org.nz",
		"org.om",
		"org.pa",
		"org.pe",
		"org.pf",
		"org.ph",
		"org.pk",
		"org.pl",
		"org.pn",
		"org.pr",
		"org.ps",
		"org.pt",
		"org.py",
		"org.qa",
		"org.ro",
		"org.rs",
		"org.rw",
		"org.sa",
		"org.sb",
		"org.sc",
		"org.sd",
		"org.se",
		"org.sg",
		"org.sh",
		"org.sk",
		"org.sl",
		"org.sn",
		"org.so",
		"org.ss",
		"org.st",
		"org.sv",
		"org.sy",
		"org.sz",
		"org.tj",
		"org.tm",
		"org.tn",
		"org.to",
		"org.tr",
		"org.tt",
		"org.tw",
		"org.ua",
		"org.ug",
		"org.uk",
		"org.uy",
		"org.uz",
		"org.vc",
		"org.ve",
		"org.vi",
		"org.vn",
		"org.vu",
		"org.ws",
		"org.ye",
		"org.za",
		"org.zm",
		"org.zw",
		"oristano.it",
		"orkanger.no",
		"orkdal.no",
		"orland.no",
		"orskog.no",
		"orsta.no",
		"os.hedmark.no",
		"os.hordaland.no",
		"osaka.jp",
		"osakasayama.osaka.jp",
		"osaki.miyagi.jp",
		"osakikamijima.hiroshima.jp",
		"osasco.br",
		"oschr.gov.pl",
		"osen.no",
		"oseto.nagasaki.jp",
		"oshima.tokyo.jp",
		"oshima.yamaguchi.jp",
		"oshino.yamanashi.jp",
		"oshu.iwate.jp",
		"oslo.no",
		"osoyro.no",
		"osteroy.no",
		"osterøy.no",
		"ostre-toten.no",
		"ostroda.pl",
		"ostroleka.pl",
		"ostrowiec.pl",
		"ostrowwlkp.pl",
		"osøyro.no",
		"ot.it",
		"ota.gunma.jp",
		"ota.tokyo.jp",
		"otake.hiroshima.jp",
		"otaki.chiba.jp",
		"otaki.nagano.jp",
		"otaki.saitama.jp",
		"otama.fukushima.jp",
		"otari.nagano.jp",
		"otaru.hokkaido.jp",
		"ote.bj",
		"other.nf",
		"oto.fukuoka.jp",
		"otobe.hokkaido.jp",
		"otofuke.hokkaido.jp",
		"otoineppu.hokkaido.jp",
		"otoyo.kochi.jp",
		"otsu.shiga.jp",
		"otsuchi.iwate.jp",
		"otsuki.kochi.jp",
		"otsuki.yamanashi.jp",
		"ouchi.saga.jp",
		"ouda.nara.jp",
		"oum.gov.pl",
		"oumu.hokkaido.jp",
		"overhalla.no",
		"ovre-eiker.no",
		"owani.aomori.jp",
		"owariasahi.aichi.jp",
		"oyabe.toyama.jp",
		"oyama.tochigi.jp",
		"oyamazaki.kyoto.jp",
		"oyer.no",
		"oygarden.no",
		"oyodo.nara.jp",
		"oystre-slidre.no",
		"oz.au",
		"ozora.hokkaido.jp",
		"ozu.ehime.jp",
		"ozu.kumamoto.jp",
		"p.bg",
		"p.se",
		"pa.gov.br",
		"pa.gov.pl",
		"pa.it",
		"pa.us",
		"padova.it",
		"padua.it",
		"pages.dev",
		"palermo.it",
		"palmas.br",
		"parachuting.aero",
		"paragliding.aero",
		"parliament.nz",
		"parma.it",
		"paroch.k12.ma.us",
		"parti.se",
		"passenger-association.aero",
		"patria.bo",
		"pavia.it",
		"pb.ao",
		"pb.gov.br",
		"pc.it",
		"pc.pl",
		"pd.it",
		"pe.ca",
		"pe.gov.br",
		"pe.it",
		"pe.kr",
		"per.jo",
		"per.la",
		"per.nf",
		"perso.ht",
		"perso.tn",
		"perugia.it",
		"pesaro-urbino.it",
		"pesarourbino.it",
		"pescara.it",
		"pg.in",
		"pg.it",
		"pharmaciens.km",
		"phd.jo",
		"phutho.vn",
		"phuyen.vn",
		"pi.gov.br",
		"pi.it",
		"piacenza.it",
		"piedmont.it",
		"piemonte.it",
		"pila.pl",
		"pilot.aero",
		"pinb.gov.pl",
		"pippu.hokkaido.jp",
		"pisa.it",
		"pistoia.it",
		"pisz.pl",
		"piw.gov.pl",
		"pl.ua",
		"plc.co.im",
		"plc.ly",
		"plc.uk",
		"plo.ps",
		"plurinacional.bo",
		"pmn.it",
		"pn.it",
		"po.gov.pl",
		"po.it",
		"poa.br",
		"podhale.pl",
		"podlasie.pl",
		"pol.dz",
		"pol.ht",
		"pol.tr",
		"police.uk",
		"politica.bo",
		"polkowice.pl",
		"poltava.ua",
		"pomorskie.pl",
		"pomorze.pl",
		"ponpes.id",
		"pordenone.it",
		"porsanger.no",
		"porsangu.no",
		"porsgrunn.no",
		"porsáŋgu.no",
		"post.in",
		"potenza.it",
		"powiat.pl",
		"pp.az",
		"pp.se",
		"ppg.br",
		"pr.gov.br",
		"pr.gov.pl",
		"pr.it",
		"pr.ml",
		"pr.us",
		"prato.it",
		"prd.fr",
		"prd.km",
		"prd.mg",
		"press.aero",
		"press.cy",
		"press.ma",
		"press.se",
		"presse.km",
		"presse.ml",
		"pri.ee",
		"principe.st",
		"priv.hu",
		"priv.me",
		"priv.no",
		"priv.pl",
		"pro.az",
		"pro.br",
		"pro.cy",
		"pro.ec",
		"pro.fj",
		"pro.ht",
		"pro.in",
		"pro.mv",
		"pro.om",
		"pro.pr",
		"pro.tt",
		"pro.vn",
		"prochowice.pl",
		"production.aero",
		"prof.ec",
		"prof.pr",
		"profesional.bo",
		"pruszkow.pl",
		"przeworsk.pl",
		"psc.br",
		"psi.br",
		"psic.ec",
		"psiq.ec",
		"psp.gov.pl",
		"psse.gov.pl",
		"pt.it",
		"pu.it",
		"pub.ec",
		"pub.sa",
		"publ.cv",
		"publ.pt",
		"pueblo.bo",
		"pug.it",
		"puglia.it",
		"pulawy.pl",
		"pup.gov.pl",
		"pv.it",
		"pvh.br",
		"pvt.ge",
		"pvt.k12.ma.us",
		"pz.it",
		"q.bg",
		"qc.ca",
		"qh.cn",
		"qld.au",
		"qld.edu.au",
		"qld.gov.au",
		"qsl.br",
		"quangbinh.vn",
		"quangnam.vn",
		"quangngai.vn",
		"quangninh.vn",
		"quangtri.vn",
		"r.bg",
		"r.se",
		"ra.it",
		"rade.no",
		"radio.br",
		"radom.pl",
		"radoy.no",
		"radøy.no",
		"ragusa.it",
		"rahkkeravju.no",
		"raholt.no",
		"raisa.no",
		"rakkestad.no",
		"ralingen.no",
		"rana.no",
		"randaberg.no",
		"rankoshi.hokkaido.jp",
		"ranzan.saitama.jp",
		"rar.ve",
		"rauma.no",
		"ravenna.it",
		"rawa-maz.pl",
		"rc.it",
		"re.it",
		"re.kr",
		"re.no",
		"realestate.pl",
		"rebun.hokkaido.jp",
		"rec.br",
		"rec.nf",
		"rec.ro",
		"rec.ve",
		"recht.pro",
		"recife.br",
		"recreation.aero",
		"red.sv",
		"reggio-calabria.it",
		"reggio-emilia.it",
		"reggiocalabria.it",
		"reggioemilia.it",
		"reklam.hu",
		"rel.ht",
		"rel.pl",
		"rendalen.no",
		"rennebu.no",
		"rennesoy.no",
		"rennesøy.no",
		"rep.br",
		"rep.kp",
		"repbody.aero",
		"res.aero",
		"res.in",
		"research.aero",
		"restaurant.bj",
		"resto.bj",
		"revista.bo",
		"rg.it",
		"ri.it",
		"ri.us",
		"ribeirao.br",
		"rieti.it",
		"rifu.miyagi.jp",
		"riik.ee",
		"rikubetsu.hokkaido.jp",
		"rikuzentakata.iwate.jp",
		"rimini.it",
		"rindal.no",
		"ringebu.no",
		"ringerike.no",
		"ringsaker.no",
		"rio.br",
		"rio.ec",
		"riobranco.br",
		"riopreto.br",
		"rishiri.hokkaido.jp",
		"rishirifuji.hokkaido.jp",
		"risor.no",
		"rissa.no",
		"risør.no",
		"ritto.shiga.jp",
		"rivne.ua",
		"rj.gov.br",
		"rl.no",
		"rm.it",
		"rn.gov.br",
		"rn.it",
		"ro.gov.br",
		"ro.it",
		"roan.no",
		"rodoy.no",
		"rokunohe.aomori.jp",
		"rollag.no",
		"roma.it",
		"rome.it",
		"romsa.no",
		"romskog.no",
		"roros.no",
		"rost.no",
		"rotorcraft.aero",
		"rovigo.it",
		"rovno.ua",
		"royken.no",
		"royrvik.no",
		"rr.gov.br",
		"rrpp.ec",
		"rs.gov.br",
		"ruovat.no",
		"rv.ua",
		"rybnik.pl",
		"rygge.no",
		"ryokami.saitama.jp",
		"ryugasaki.ibaraki.jp",
		"ryuoh.shiga.jp",
		"rzeszow.pl",
		"rzgw.gov.pl",
		"ráhkkerávju.no",
		"ráisa.no",
		"råde.no",
		"råholt.no",
		"rælingen.no",
		"rødøy.no",
		"rømskog.no",
		"røros.no",
		"røst.no",
		"røyken.no",
		"røyrvik.no",
		"s.bg",
		"s.se",
		"sa.au",
		"sa.cr",
		"sa.edu.au",
		"sa.gov.au",
		"sa.gov.pl",
		"sa.it",
		"sabae.fukui.jp",
		"sado.niigata.jp",
		"safety.aero",
		"saga.jp",
		"saga.saga.jp",
		"sagae.yamagata.jp",
		"sagamihara.kanagawa.jp",
		"saigawa.fukuoka.jp",
		"saijo.ehime.jp",
		"saikai.nagasaki.jp",
		"saiki.oita.jp",
		"saitama.jp",
		"saitama.saitama.jp",
		"saito.miyazaki.jp",
		"saka.hiroshima.jp",
		"sakado.saitama.jp",
		"sakae.chiba.jp",
		"sakae.nagano.jp",
		"sakahogi.gifu.jp",
		"sakai.fukui.jp",
		"sakai.ibaraki.jp",
		"sakai.osaka.jp",
		"sakaiminato.tottori.jp",
		"sakaki.nagano.jp",
		"sakata.yamagata.jp",
		"sakawa.kochi.jp",
		"sakegawa.yamagata.jp",
		"saku.nagano.jp",
		"sakuho.nagano.jp",
		"sakura.chiba.jp",
		"sakura.tochigi.jp",
		"sakuragawa.ibaraki.jp",
		"sakurai.nara.jp",
		"sakyo.kyoto.jp",
		"sal.ec",
		"salangen.no",
		"salat.no",
		"salerno.it",
		"saltdal.no",
		"salud.bo",
		"salvador.br",
		"samegawa.fukushima.jp",
		"samnanger.no",
		"sampa.br",
		"samukawa.kanagawa.jp",
		"sanagochi.tokushima.jp",
		"sanda.hyogo.jp",
		"sande.more-og-romsdal.no",
		"sande.møre-og-romsdal.no",
		"sande.vestfold.no",
		"sandefjord.no",
		"sandnes.no",
		"sandnessjoen.no",
		"sandnessjøen.no",
		"sandoy.no",
		"sandøy.no",
		"sango.nara.jp",
		"sanjo.niigata.jp",
		"sannan.hyogo.jp",
		"sannohe.aomori.jp",
		"sano.tochigi.jp",
		"sanok.pl",
		"santamaria.br",
		"santoandre.br",
		"sanuki.kagawa.jp",
		"saobernardo.br",
		"saogonca.br",
		"saotome.st",
		"sapporo.jp",
		"sar.it",
		"sardegna.it",
		"sardinia.it",
		"saroma.hokkaido.jp",
		"sarpsborg.no",
		"sarufutsu.hokkaido.jp",
		"sasaguri.fukuoka.jp",
		"sasayama.hyogo.jp",
		"sasebo.nagasaki.jp",
		"sassari.it",
		"satosho.okayama.jp",
		"satsumasendai.kagoshima.jp",
		"satte.saitama.jp",
		"sauda.no",
		"sauherad.no",
		"savona.it",
		"sayama.osaka.jp",
		"sayama.saitama.jp",
		"sayo.hyogo.jp",
		"sb.ua",
		"sc.cn",
		"sc.gov.br",
		"sc.ke",
		"sc.kr",
		"sc.ls",
		"sc.tz",
		"sc.ug",
		"sc.us",
		"sch.ae",
		"sch.bd",
		"sch.id",
		"sch.ir",
		"sch.jo",
		"sch.lk",
		"sch.ly",
		"sch.ng",
		"sch.qa",
		"sch.sa",
		"sch.ss",
		"sch.uk",
		"sch.zm",
		"school.ge",
		"school.in",
		"school.nz",
		"school.za",
		"sci.eg",
		"scientist.aero",
		"sd.cn",
		"sd.us",
		"sdn.gov.pl",
		"se.gov.br",
		"sebastopol.ua",
		"sec.ps",
		"seg.ar",
		"seg.br",
		"seihi.nagasaki.jp",
		"seika.kyoto.jp",
		"seiro.niigata.jp",
		"seirou.niigata.jp",
		"seiyo.ehime.jp",
		"sejny.pl",
		"seki.gifu.jp",
		"sekigahara.gifu.jp",
		"sekikawa.niigata.jp",
		"sel.no",
		"selbu.no",
		"selje.no",
		"seljord.no",
		"semboku.akita.jp",
		"semine.miyagi.jp",
		"senasa.ar",
		"sendai.jp",
		"sennan.osaka.jp",
		"seoul.kr",
		"sera.hiroshima.jp",
		"seranishi.hiroshima.jp",
		"services.aero",
		"setagaya.tokyo.jp",
		"seto.aichi.jp",
		"setouchi.okayama.jp",
		"settsu.osaka.jp",
		"sevastopol.ua",
		"sex.hu",
		"sex.pl",
		"sf.no",
		"sh.cn",
		"shakotan.hokkaido.jp",
		"shari.hokkaido.jp",
		"shibata.miyagi.jp",
		"shibata.niigata.jp",
		"shibecha.hokkaido.jp",
		"shibetsu.hokkaido.jp",
		"shibukawa.gunma.jp",
		"shibuya.tokyo.jp",
		"shichikashuku.miyagi.jp",
		"shichinohe.aomori.jp",
		"shiga.jp",
		"shiiba.miyazaki.jp",
		"shijonawate.osaka.jp",
		"shika.ishikawa.jp",
		"shikabe.hokkaido.jp",
		"shikama.miyagi.jp",
		"shikaoi.hokkaido.jp",
		"shikatsu.aichi.jp",
		"shiki.saitama.jp",
		"shikokuchuo.ehime.jp",
		"shima.mie.jp",
		"shimabara.nagasaki.jp",
		"shimada.shizuoka.jp",
		"shimamaki.hokkaido.jp",
		"shimamoto.osaka.jp",
		"shimane.jp",
		"shimane.shimane.jp",
		"shimizu.hokkaido.jp",
		"shimizu.shizuoka.jp",
		"shimoda.shizuoka.jp",
		"shimodate.ibaraki.jp",
		"shimofusa.chiba.jp",
		"shimogo.fukushima.jp",
		"shimoichi.nara.jp",
		"shimoji.okinawa.jp",
		"shimokawa.hokkaido.jp",
		"shimokitayama.nara.jp",
		"shimonita.gunma.jp",
		"shimonoseki.yamaguchi.jp",
		"shimosuwa.nagano.jp",
		"shimotsuke.tochigi.jp",
		"shimotsuma.ibaraki.jp",
		"shinagawa.tokyo.jp",
		"shinanomachi.nagano.jp",
		"shingo.aomori.jp",
		"shingu.fukuoka.jp",
		"shingu.hyogo.jp",
		"shingu.wakayama.jp",
		"shinichi.hiroshima.jp",
		"shinjo.nara.jp",
		"shinjo.okayama.jp",
		"shinjo.yamagata.jp",
		"shinjuku.tokyo.jp",
		"shinkamigoto.nagasaki.jp",
		"shinonsen.hyogo.jp",
		"shinshinotsu.hokkaido.jp",
		"shinshiro.aichi.jp",
		"shinto.gunma.jp",
		"shintoku.hokkaido.jp",
		"shintomi.miyazaki.jp",
		"shinyoshitomi.fukuoka.jp",
		"shiogama.miyagi.jp",
		"shiojiri.nagano.jp",
		"shioya.tochigi.jp",
		"shirahama.wakayama.jp",
		"shirakawa.fukushima.jp",
		"shirakawa.gifu.jp",
		"shirako.chiba.jp",
		"shiranuka.hokkaido.jp",
		"shiraoi.hokkaido.jp",
		"shiraoka.saitama.jp",
		"shirataka.yamagata.jp",
		"shiriuchi.hokkaido.jp",
		"shiroi.chiba.jp",
		"shiroishi.miyagi.jp",
		"shiroishi.saga.jp",
		"shirosato.ibaraki.jp",
		"shishikui.tokushima.jp",
		"shiso.hyogo.jp",
		"shisui.chiba.jp",
		"shitara.aichi.jp",
		"shiwa.iwate.jp",
		"shizukuishi.iwate.jp",
		"shizuoka.jp",
		"shizuoka.shizuoka.jp",
		"shobara.hiroshima.jp",
		"shonai.fukuoka.jp",
		"shonai.yamagata.jp",
		"shoo.okayama.jp",
		"shop.ht",
		"shop.hu",
		"shop.pl",
		"show.aero",
		"showa.fukushima.jp",
		"showa.gunma.jp",
		"showa.yamanashi.jp",
		"shunan.yamaguchi.jp",
		"si.it",
		"sic.it",
		"sicilia.it",
		"sicily.it",
		"siellak.no",
		"siena.it",
		"sigdal.no",
		"siljan.no",
		"siracusa.it",
		"sirdal.no",
		"sjc.br",
		"sk.ca",
		"skanit.no",
		"skanland.no",
		"skaun.no",
		"skedsmo.no",
		"skedsmokorset.no",
		"ski.no",
		"skien.no",
		"skierva.no",
		"skiervá.no",
		"skiptvet.no",
		"skjak.no",
		"skjervoy.no",
		"skjervøy.no",
		"skjåk.no",
		"sklep.pl",
		"sko.gov.pl",
		"skoczow.pl",
		"skodje.no",
		"skydiving.aero",
		"skánit.no",
		"skånland.no",
		"slask.pl",
		"slattum.no",
		"sld.do",
		"sld.pa",
		"slg.br",
		"slupsk.pl",
		"slz.br",
		"sm.ua",
		"smola.no",
		"smøla.no",
		"sn.cn",
		"snaase.no",
		"snasa.no",
		"snillfjord.no",
		"snoasa.no",
		"snåase.no",
		"snåsa.no",
		"so.gov.pl",
		"so.it",
		"sobetsu.hokkaido.jp",
		"soc.dz",
		"soc.lk",
		"social.br",
		"soctrang.vn",
		"sodegaura.chiba.jp",
		"soeda.fukuoka.jp",
		"software.aero",
		"sogndal.no",
		"sogne.no",
		"soja.okayama.jp",
		"soka.saitama.jp",
		"sokndal.no",
		"sola.no",
		"solund.no",
		"soma.fukushima.jp",
		"somna.no",
		"sondre-land.no",
		"sondrio.it",
		"songdalen.no",
		"soni.nara.jp",
		"sonla.vn",
		"soo.kagoshima.jp",
		"sor-aurdal.no",
		"sor-fron.no",
		"sor-odal.no",
		"sor-varanger.no",
		"sorfold.no",
		"sorocaba.br",
		"sorreisa.no",
		"sortland.no",
		"sorum.no",
		"sos.pl",
		"sosa.chiba.jp",
		"sosnowiec.pl",
		"sowa.ibaraki.jp",
		"sp.gov.br",
		"sp.it",
		"spjelkavik.no",
		"sport.eg",
		"sport.hu",
		"spydeberg.no",
		"sr.gov.pl",
		"sr.it",
		"srv.br",
		"ss.it",
		"st.no",
		"stalowa-wola.pl",
		"stange.no",
		"starachowice.pl",
		"stargard.pl",
		"starostwo.gov.pl",
		"stat.no",
		"stathelle.no",
		"stavanger.no",
		"stavern.no",
		"steigen.no",
		"steinkjer.no",
		"sth.ac.at",
		"stjordal.no",
		"stjordalshalsen.no",
		"stjørdal.no",
		"stjørdalshalsen.no",
		"stokke.no",
		"stor-elvdal.no",
		"stord.no",
		"stordal.no",
		"store.bb",
		"store.nf",
		"store.ro",
		"store.st",
		"store.ve",
		"storfjord.no",
		"strand.no",
		"stranda.no",
		"stryn.no",
		"student.aero",
		"su.it",
		"sud-sardegna.it",
		"sudsardegna.it",
		"sue.fukuoka.jp",
		"suedtirol.it",
		"suginami.tokyo.jp",
		"sugito.saitama.jp",
		"suifu.ibaraki.jp",
		"suita.osaka.jp",
		"sukagawa.fukushima.jp",
		"sukumo.kochi.jp",
		"sula.no",
		"suldal.no",
		"suli.hu",
		"sumida.tokyo.jp",
		"sumita.iwate.jp",
		"sumoto.hyogo.jp",
		"sumoto.kumamoto.jp",
		"sumy.ua",
		"sunagawa.hokkaido.jp",
		"sund.no",
		"sunndal.no",
		"suohkan.no",
		"surnadal.no",
		"susaki.kochi.jp",
		"susono.shizuoka.jp",
		"suwa.nagano.jp",
		"suwalki.pl",
		"suzaka.nagano.jp",
		"suzu.ishikawa.jp",
		"suzuka.mie.jp",
		"sv.it",
		"svalbard.no",
		"sveio.no",
		"svelvik.no",
		"swidnica.pl",
		"swiebodzin.pl",
		"swinoujscie.pl",
		"sx.cn",
		"sykkylven.no",
		"szczecin.pl",
		"szczytno.pl",
		"szex.hu",
		"szkola.pl",
		"sálat.no",
		"sálát.no",
		"søgne.no",
		"sømna.no",
		"søndre-land.no",
		"sør-aurdal.no",
		"sør-fron.no",
		"sør-odal.no",
		"sør-varanger.no",
		"sørfold.no",
		"sørreisa.no",
		"sørum.no",
		"südtirol.it",
		"t.bg",
		"t.se",
		"ta.it",
		"taa.it",
		"tabayama.yamanashi.jp",
		"tabuse.yamaguchi.jp",
		"tachiarai.fukuoka.jp",
		"tachikawa.tokyo.jp",
		"tadaoka.osaka.jp",
		"tado.mie.jp",
		"tadotsu.kagawa.jp",
		"tagajo.miyagi.jp",
		"tagami.niigata.jp",
		"tagawa.fukuoka.jp",
		"tahara.aichi.jp",
		"taiji.wakayama.jp",
		"taiki.hokkaido.jp",
		"taiki.mie.jp",
		"tainai.niigata.jp",
		"taira.toyama.jp",
		"taishi.hyogo.jp",
		"taishi.osaka.jp",
		"taishin.fukushima.jp",
		"taito.tokyo.jp",
		"taiwa.miyagi.jp",
		"tajimi.gifu.jp",
		"tajiri.osaka.jp",
		"taka.hyogo.jp",
		"takagi.nagano.jp",
		"takahagi.ibaraki.jp",
		"takahama.aichi.jp",
		"takahama.fukui.jp",
		"takaharu.miyazaki.jp",
		"takahashi.okayama.jp",
		"takahata.yamagata.jp",
		"takaishi.osaka.jp",
		"takamatsu.kagawa.jp",
		"takamori.kumamoto.jp",
		"takamori.nagano.jp",
		"takanabe.miyazaki.jp",
		"takanezawa.tochigi.jp",
		"takaoka.toyama.jp",
		"takarazuka.hyogo.jp",
		"takasago.hyogo.jp",
		"takasaki.gunma.jp",
		"takashima.shiga.jp",
		"takasu.hokkaido.jp",
		"takata.fukuoka.jp",
		"takatori.nara.jp",
		"takatsuki.osaka.jp",
		"takatsuki.shiga.jp",
		"takayama.gifu.jp",
		"takayama.gunma.jp",
		"takayama.nagano.jp",
		"takazaki.miyazaki.jp",
		"takehara.hiroshima.jp",
		"taketa.oita.jp",
		"taketomi.okinawa.jp",
		"taki.mie.jp",
		"takikawa.hokkaido.jp",
		"takino.hyogo.jp",
		"takinoue.hokkaido.jp",
		"takko.aomori.jp",
		"tako.chiba.jp",
		"taku.saga.jp",
		"tama.tokyo.jp",
		"tamakawa.fukushima.jp",
		"tamaki.mie.jp",
		"tamamura.gunma.jp",
		"tamano.okayama.jp",
		"tamatsukuri.ibaraki.jp",
		"tamayu.shimane.jp",
		"tamba.hyogo.jp",
		"tana.no",
		"tanabe.kyoto.jp",
		"tanabe.wakayama.jp",
		"tanagura.fukushima.jp",
		"tananger.no",
		"tanohata.iwate.jp",
		"tara.saga.jp",
		"tarama.okinawa.jp",
		"taranto.it",
		"targi.pl",
		"tarnobrzeg.pl",
		"tarui.gifu.jp",
		"tarumizu.kagoshima.jp",
		"tas.au",
		"tas.edu.au",
		"tas.gov.au",
		"tatebayashi.gunma.jp",
		"tateshina.nagano.jp",
		"tateyama.chiba.jp",
		"tateyama.toyama.jp",
		"tatsuno.hyogo.jp",
		"tatsuno.nagano.jp",
		"tawaramoto.nara.jp",
		"taxi.aero",
		"taxi.br",
		"tayninh.vn",
		"tc.br",
		"te.it",
		"te.ua",
		"tec.br",
		"tec.mi.us",
		"tec.ve",
		"tech.ec",
		"tecnologia.bo",
		"tel.tr",
		"tempio-olbia.it",
		"tempioolbia.it",
		"tendo.yamagata.jp",
		"tenei.fukushima.jp",
		"tenkawa.nara.jp",
		"tenri.nara.jp",
		"teo.br",
		"teramo.it",
		"terni.it",
		"ternopil.ua",
		"teshikaga.hokkaido.jp",
		"test.tj",
		"tgory.pl",
		"thaibinh.vn",
		"thainguyen.vn",
		"thanhhoa.vn",
		"thanhphohochiminh.vn",
		"the.br",
		"thuathienhue.vn",
		"tiengiang.vn",
		"time.no",
		"tingvoll.no",
		"tinn.no",
		"tj.cn",
		"tjeldsund.no",
		"tjielte.no",
		"tjome.no",
		"tjøme.no",
		"tksat.bo",
		"tm.cy",
		"tm.dz",
		"tm.fr",
		"tm.hu",
		"tm.km",
		"tm.mc",
		"tm.no",
		"tm.pl",
		"tm.ro",
		"tm.se",
		"tm.za",
		"tmp.br",
		"tn.it",
		"tn.us",
		"tnx.ge",
		"to.gov.br",
		"to.it",
		"toba.mie.jp",
		"tobe.ehime.jp",
		"tobetsu.hokkaido.jp",
		"tobishima.aichi.jp",
		"tochigi.jp",
		"tochigi.tochigi.jp",
		"tochio.niigata.jp",
		"toda.saitama.jp",
		"toei.aichi.jp",
		"toga.toyama.jp",
		"togakushi.nagano.jp",
		"togane.chiba.jp",
		"togitsu.nagasaki.jp",
		"togo.aichi.jp",
		"togura.nagano.jp",
		"tohma.hokkaido.jp",
		"tohnosho.chiba.jp",
		"toho.fukuoka.jp",
		"tokai.aichi.jp",
		"tokai.ibaraki.jp",
		"tokamachi.niigata.jp",
		"tokashiki.okinawa.jp",
		"toki.gifu.jp",
		"tokigawa.saitama.jp",
		"tokke.no",
		"tokoname.aichi.jp",
		"tokorozawa.saitama.jp",
		"tokushima.jp",
		"tokushima.tokushima.jp",
		"tokuyama.yamaguchi.jp",
		"tokyo.jp",
		"tolga.no",
		"tomakomai.hokkaido.jp",
		"tomari.hokkaido.jp",
		"tome.miyagi.jp",
		"tomi.nagano.jp",
		"tomigusuku.okinawa.jp",
		"tomika.gifu.jp",
		"tomioka.gunma.jp",
		"tomisato.chiba.jp",
		"tomiya.miyagi.jp",
		"tomobe.ibaraki.jp",
		"tonaki.okinawa.jp",
		"tonami.toyama.jp",
		"tondabayashi.osaka.jp",
		"tone.ibaraki.jp",
		"tono.iwate.jp",
		"tonosho.kagawa.jp",
		"tonsberg.no",
		"toon.ehime.jp",
		"torahime.shiga.jp",
		"toride.ibaraki.jp",
		"torino.it",
		"torsken.no",
		"tos.it",
		"tosa.kochi.jp",
		"tosashimizu.kochi.jp",
		"toscana.it",
		"toshima.tokyo.jp",
		"tosu.saga.jp",
		"tottori.jp",
		"tottori.tottori.jp",
		"tourism.bj",
		"tourism.pl",
		"tourism.tn",
		"towada.aomori.jp",
		"toya.hokkaido.jp",
		"toyako.hokkaido.jp",
		"toyama.jp",
		"toyama.toyama.jp",
		"toyo.kochi.jp",
		"toyoake.aichi.jp",
		"toyohashi.aichi.jp",
		"toyokawa.aichi.jp",
		"toyonaka.osaka.jp",
		"toyone.aichi.jp",
		"toyono.osaka.jp",
		"toyooka.hyogo.jp",
		"toyosato.shiga.jp",
		"toyota.aichi.jp",
		"toyota.yamaguchi.jp",
		"toyotomi.hokkaido.jp",
		"toyotsu.fukuoka.jp",
		"toyoura.hokkaido.jp",
		"tozawa.yamagata.jp",
		"tozsde.hu",
		"tp.it",
		"tr.it",
		"tr.no",
		"tra.kp",
		"trader.aero",
		"trading.aero",
		"trainer.aero",
		"trana.no",
		"tranby.no",
		"trani-andria-barletta.it",
		"trani-barletta-andria.it",
		"traniandriabarletta.it",
		"tranibarlettaandria.it",
		"tranoy.no",
		"transporte.bo",
		"tranøy.no",
		"trapani.it",
		"travel.in",
		"travel.pl",
		"travinh.vn",
		"trd.br",
		"trentin-sud-tirol.it",
		"trentin-sudtirol.it",
		"trentin-sued-tirol.it",
		"trentin-suedtirol.it",
		"trentin-süd-tirol.it",
		"trentin-südtirol.it",
		"trentino-a-adige.it",
		"trentino-aadige.it",
		"trentino-alto-adige.it",
		"trentino-altoadige.it",
		"trentino-s-tirol.it",
		"trentino-stirol.it",
		"trentino-sud-tirol.it",
		"trentino-sudtirol.it",
		"trentino-sued-tirol.it",
		"trentino-suedtirol.it",
		"trentino-süd-tirol.it",
		"trentino-südtirol.it",
		"trentino.it",
		"trentinoa-adige.it",
		"trentinoaadige.it",
		"trentinoalto-adige.it",
		"trentinoaltoadige.it",
		"trentinos-tirol.it",
		"trentinostirol.it",
		"trentinosud-tirol.it",
		"trentinosued-tirol.it",
		"trentinosuedtirol.it",
		"trentinosüd-tirol.it",
		"trentinosüdtirol.it",
		"trentinsud-tirol.it",
		"trentinsudtirol.it",
		"trentinsued-tirol.it",
		"trentinsuedtirol.it",
		"trentinsüd-tirol.it",
		"trentinsüdtirol.it",
		"trento.it",
		"treviso.it",
		"trieste.it",
		"troandin.no",
		"trogstad.no",
		"tromsa.no",
		"tromso.no",
		"tromsø.no",
		"trondheim.no",
		"trysil.no",
		"træna.no",
		"trøgstad.no",
		"ts.it",
		"tsk.tr",
		"tsu.mie.jp",
		"tsubame.niigata.jp",
		"tsubata.ishikawa.jp",
		"tsubetsu.hokkaido.jp",
		"tsuchiura.ibaraki.jp",
		"tsuga.tochigi.jp",
		"tsugaru.aomori.jp",
		"tsuiki.fukuoka.jp",
		"tsukigata.hokkaido.jp",
		"tsukiyono.gunma.jp",
		"tsukuba.ibaraki.jp",
		"tsukui.kanagawa.jp",
		"tsukumi.oita.jp",
		"tsumagoi.gunma.jp",
		"tsunan.niigata.jp",
		"tsuno.kochi.jp",
		"tsuno.miyazaki.jp",
		"tsuru.yamanashi.jp",
		"tsuruga.fukui.jp",
		"tsurugashima.saitama.jp",
		"tsurugi.ishikawa.jp",
		"tsuruoka.yamagata.jp",
		"tsuruta.aomori.jp",
		"tsushima.aichi.jp",
		"tsushima.nagasaki.jp",
		"tsuwano.shimane.jp",
		"tsuyama.okayama.jp",
		"tt.im",
		"tul.ec",
		"tur.ar",
		"tur.br",
		"tur.ec",
		"turek.pl",
		"turin.it",
		"turystyka.pl",
		"tuscany.it",
		"tuyenquang.vn",
		"tv.bb",
		"tv.bd",
		"tv.bo",
		"tv.br",
		"tv.eg",
		"tv.im",
		"tv.in",
		"tv.it",
		"tv.jo",
		"tv.sd",
		"tv.tr",
		"tv.tz",
		"tvedestrand.no",
		"tw.cn",
		"tx.us",
		"tychy.pl",
		"tydal.no",
		"tynset.no",
		"tysfjord.no",
		"tysnes.no",
		"tysvar.no",
		"tysvær.no",
		"tønsberg.no",
		"u.bg",
		"u.se",
		"ub.in",
		"ube.yamaguchi.jp",
		"uchihara.ibaraki.jp",
		"uchiko.ehime.jp",
		"uchinada.ishikawa.jp",
		"uchinomi.kagawa.jp",
		"ud.it",
		"uda.nara.jp",
		"udi.br",
		"udine.it",
		"udono.mie.jp",
		"ueda.nagano.jp",
		"ueno.gunma.jp",
		"uenohara.yamanashi.jp",
		"uenorge.no",
		"ug.gov.pl",
		"ugim.gov.pl",
		"uio.ec",
		"uji.kyoto.jp",
		"ujiie.tochigi.jp",
		"ujitawara.kyoto.jp",
		"uk.in",
		"uki.kumamoto.jp",
		"ukiha.fukuoka.jp",
		"ullensaker.no",
		"ullensvang.no",
		"ulsan.kr",
		"ulstein.no",
		"ulvik.no",
		"um.gov.pl",
		"umaji.kochi.jp",
		"umb.it",
		"umbria.it",
		"umi.fukuoka.jp",
		"umig.gov.pl",
		"unazuki.toyama.jp",
		"union.aero",
		"univ.bj",
		"univ.sn",
		"unjarga.no",
		"unjárga.no",
		"unnan.shimane.jp",
		"unzen.nagasaki.jp",
		"uonuma.niigata.jp",
		"uozu.toyama.jp",
		"up.in",
		"upow.gov.pl",
		"uppo.gov.pl",
		"urakawa.hokkaido.jp",
		"urasoe.okinawa.jp",
		"urausu.hokkaido.jp",
		"urawa.saitama.jp",
		"urayasu.chiba.jp",
		"urbino-pesaro.it",
		"urbinopesaro.it",
		"ureshino.mie.jp",
		"uri.arpa",
		"urn.arpa",
		"uruma.okinawa.jp",
		"uryu.hokkaido.jp",
		"us.gov.pl",
		"us.in",
		"us.ug",
		"usa.oita.jp",
		"ushiku.ibaraki.jp",
		"ustka.pl",
		"usui.fukuoka.jp",
		"usuki.oita.jp",
		"ut.us",
		"utashinai.hokkaido.jp",
		"utazas.hu",
		"utazu.kagawa.jp",
		"uto.kumamoto.jp",
		"utsira.no",
		"utsunomiya.tochigi.jp",
		"uw.gov.pl",
		"uwajima.ehime.jp",
		"uz.ua",
		"uzhgorod.ua",
		"uzhhorod.ua",
		"uzs.gov.pl",
		"v.bg",
		"va.it",
		"va.no",
		"va.us",
		"vaapste.no",
		"vadso.no",
		"vadsø.no",
		"vaga.no",
		"vagan.no",
		"vagsoy.no",
		"vaksdal.no",
		"val-d-aosta.it",
		"val-daosta.it",
		"vald-aosta.it",
		"valer.hedmark.no",
		"valer.ostfold.no",
		"valle-aosta.it",
		"valle-d-aosta.it",
		"valle-daosta.it",
		"valle.no",
		"valleaosta.it",
		"valled-aosta.it",
		"valledaosta.it",
		"vallee-aoste.it",
		"vallee-d-aoste.it",
		"valleeaoste.it",
		"valleedaoste.it",
		"vallée-aoste.it",
		"vallée-d-aoste.it",
		"valléeaoste.it",
		"valléedaoste.it",
		"vang.no",
		"vanylven.no",
		"vao.it",
		"vardo.no",
		"vardø.no",
		"varese.it",
		"varggat.no",
		"varoy.no",
		"vb.it",
		"vc.it",
		"vda.it",
		"ve.it",
		"vefsn.no",
		"vega.no",
		"vegarshei.no",
		"vegårshei.no",
		"ven.it",
		"veneto.it",
		"venezia.it",
		"venice.it",
		"vennesla.no",
		"verbania.it",
		"verbano-cusio-ossola.it",
		"vercel.app",
		"vercelli.it",
		"verdal.no",
		"verona.it",
		"verran.no",
		"vestby.no",
		"vestnes.no",
		"vestre-slidre.no",
		"vestre-toten.no",
		"vestvagoy.no",
		"vestvågøy.no",
		"vet.br",
		"vet.ec",
		"veterinaire.km",
		"vevelstad.no",
		"vf.no",
		"vgs.no",
		"vi.it",
		"vi.us",
		"vibo-valentia.it",
		"vibovalentia.it",
		"vic.au",
		"vic.edu.au",
		"vic.gov.au",
		"vicenza.it",
		"video.hu",
		"vik.no",
		"vikna.no",
		"vindafjord.no",
		"vinhlong.vn",
		"vinhphuc.vn",
		"vinnica.ua",
		"vinnytsia.ua",
		"viterbo.it",
		"vix.br",
		"vlog.br",
		"vn.ua",
		"voagat.no",
		"volda.no",
		"volyn.ua",
		"voss.no",
		"vossevangen.no",
		"vr.it",
		"vs.it",
		"vt.it",
		"vt.us",
		"vv.it",
		"várggát.no",
		"vågan.no",
		"vågsøy.no",
		"vågå.no",
		"våler.hedmark.no",
		"våler.østfold.no",
		"værøy.no",
		"w.bg",
		"w.se",
		"wa.au",
		"wa.edu.au",
		"wa.gov.au",
		"wa.us",
		"wada.nagano.jp",
		"wajiki.tokushima.jp",
		"wajima.ishikawa.jp",
		"wakasa.fukui.jp",
		"wakasa.tottori.jp",
		"wakayama.jp",
		"wakayama.wakayama.jp",
		"wake.okayama.jp",
		"wakkanai.hokkaido.jp",
		"wakuya.miyagi.jp",
		"walbrzych.pl",
		"wanouchi.gifu.jp",
		"warabi.saitama.jp",
		"warmia.pl",
		"warszawa.pl",
		"washtenaw.mi.us",
		"wassamu.hokkaido.jp",
		"watarai.mie.jp",
		"watari.miyagi.jp",
		"waw.pl",
		"wazuka.kyoto.jp",
		"web.app",
		"web.bo",
		"web.do",
		"web.gu",
		"web.id",
		"web.lk",
		"web.nf",
		"web.ni",
		"web.pk",
		"web.tj",
		"web.tr",
		"web.ve",
		"web.za",
		"wegrow.pl",
		"wi.us",
		"wielun.pl",
		"wif.gov.pl",
		"wiih.gov.pl",
		"wiki.bo",
		"wiki.br",
		"winb.gov.pl",
		"wios.gov.pl",
		"witd.gov.pl",
		"wiw.gov.pl",
		"wkz.gov.pl",
		"wlocl.pl",
		"wloclawek.pl",
		"wodzislaw.pl",
		"wolomin.pl",
		"workinggroup.aero",
		"works.aero",
		"wroclaw.pl",
		"wsa.gov.pl",
		"wskr.gov.pl",
		"wsse.gov.pl",
		"wuoz.gov.pl",
		"wv.us",
		"www.ro",
		"wy.us",
		"wzmiuw.gov.pl",
		"x.bg",
		"x.se",
		"xj.cn",
		"xxx.ec",
		"xyz.br",
		"xz.cn",
		"y.bg",
		"y.se",
		"yabu.hyogo.jp",
		"yabuki.fukushima.jp",
		"yachimata.chiba.jp",
		"yachiyo.chiba.jp",
		"yachiyo.ibaraki.jp",
		"yaese.okinawa.jp",
		"yahaba.iwate.jp",
		"yahiko.niigata.jp",
		"yaita.tochigi.jp",
		"yaizu.shizuoka.jp",
		"yakage.okayama.jp",
		"yakumo.hokkaido.jp",
		"yakumo.shimane.jp",
		"yalta.ua",
		"yamada.fukuoka.jp",
		"yamada.iwate.jp",
		"yamada.toyama.jp",
		"yamaga.kumamoto.jp",
		"yamagata.gifu.jp",
		"yamagata.ibaraki.jp",
		"yamagata.jp",
		"yamagata.nagano.jp",
		"yamagata.yamagata.jp",
		"yamaguchi.jp",
		"yamakita.kanagawa.jp",
		"yamamoto.miyagi.jp",
		"yamanakako.yamanashi.jp",
		"yamanashi.jp",
		"yamanashi.yamanashi.jp",
		"yamanobe.yamagata.jp",
		"yamanouchi.nagano.jp",
		"yamashina.kyoto.jp",
		"yamato.fukushima.jp",
		"yamato.kanagawa.jp",
		"yamato.kumamoto.jp",
		"yamatokoriyama.nara.jp",
		"yamatotakada.nara.jp",
		"yamatsuri.fukushima.jp",
		"yamazoe.nara.jp",
		"yame.fukuoka.jp",
		"yanagawa.fukuoka.jp",
		"yanaizu.fukushima.jp",
		"yao.osaka.jp",
		"yaotsu.gifu.jp",
		"yasaka.nagano.jp",
		"yashio.saitama.jp",
		"yashiro.hyogo.jp",
		"yasu.shiga.jp",
		"yasuda.kochi.jp",
		"yasugi.shimane.jp",
		"yasuoka.nagano.jp",
		"yatomi.aichi.jp",
		"yatsuka.shimane.jp",
		"yatsushiro.kumamoto.jp",
		"yawara.ibaraki.jp",
		"yawata.kyoto.jp",
		"yawatahama.ehime.jp",
		"yazu.tottori.jp",
		"yenbai.vn",
		"yk.ca",
		"yn.cn",
		"yoichi.hokkaido.jp",
		"yoita.niigata.jp",
		"yoka.hyogo.jp",
		"yokaichiba.chiba.jp",
		"yokawa.hyogo.jp",
		"yokkaichi.mie.jp",
		"yokohama.jp",
		"yokoshibahikari.chiba.jp",
		"yokosuka.kanagawa.jp",
		"yokote.akita.jp",
		"yokoze.saitama.jp",
		"yomitan.okinawa.jp",
		"yonabaru.okinawa.jp",
		"yonago.tottori.jp",
		"yonaguni.okinawa.jp",
		"yonezawa.yamagata.jp",
		"yono.saitama.jp",
		"yorii.saitama.jp",
		"yoro.gifu.jp",
		"yoshida.saitama.jp",
		"yoshida.shizuoka.jp",
		"yoshikawa.saitama.jp",
		"yoshimi.saitama.jp",
		"yoshino.nara.jp",
		"yoshinogari.saga.jp",
		"yoshioka.gunma.jp",
		"yotsukaido.chiba.jp",
		"yuasa.wakayama.jp",
		"yufu.oita.jp",
		"yugawa.fukushima.jp",
		"yugawara.kanagawa.jp",
		"yuki.ibaraki.jp",
		"yukuhashi.fukuoka.jp",
		"yura.wakayama.jp",
		"yurihonjo.akita.jp",
		"yusuhara.kochi.jp",
		"yusui.kagoshima.jp",
		"yuu.yamaguchi.jp",
		"yuza.yamagata.jp",
		"yuzawa.niigata.jp",
		"z.bg",
		"z.se",
		"zachpomor.pl",
		"zagan.pl",
		"zakarpattia.ua",
		"zama.kanagawa.jp",
		"zamami.okinawa.jp",
		"zao.miyagi.jp",
		"zaporizhzhe.ua",
		"zaporizhzhia.ua",
		"zarow.pl",
		"zentsuji.kagawa.jp",
		"zgora.pl",
		"zgorzelec.pl",
		"zhitomir.ua",
		"zhytomyr.ua",
		"zj.cn",
		"zlg.br",
		"zp.gov.pl",
		"zp.ua",
		"zpisdn.gov.pl",
		"zt.ua",
		"zushi.kanagawa.jp",
		"ákŋoluokta.no",
		"álaheadju.no",
		"áltá.no",
		"åfjord.no",
		"åkrehamn.no",
		"ål.no",
		"ålesund.no",
		"ålgård.no",
		"åmli.no",
		"åmot.no",
		"årdal.no",
		"ås.no",
		"åseral.no",
		"åsnes.no",
		"øksnes.no",
		"ørland.no",
		"ørskog.no",
		"ørsta.no",
		"østre-toten.no",
		"øvre-eiker.no",
		"øyer.no",
		"øygarden.no",
		"øystre-slidre.no",
		"čáhcesuolo.no",
		"ак.срб",
		"обр.срб",
		"од.срб",
		"орг.срб",
		"пр.срб",
		"упр.срб",
		"אקדמיה.ישראל",
		"ישוב.ישראל",
		"ממשל.ישראל",
		"צהל.ישראל",
		"ايران.ir",
		"ایران.ir",
		"ทหาร.ไทย",
		"ธุรกิจ.ไทย",
		"รัฐบาล.ไทย",
		"ศึกษา.ไทย",
		"องค์กร.ไทย",
		"เน็ต.ไทย",
		"ᬩᬮᬶ.id",
		"三重.jp",
		"个人.hk",
		"京都.jp",
		"佐賀.jp",
		"個人.hk",
		"個人.香港",
		"公司.cn",
		"公司.hk",
		"公司.香港",
		"兵庫.jp",
		"北海道.jp",
		"千葉.jp",
		"和歌山.jp",
		"埼玉.jp",
		"大分.jp",
		"大阪.jp",
		"奈良.jp",
		"宮城.jp",
		"宮崎.jp",
		"富山.jp",
		"山口.jp",
		"山形.jp",
		"山梨.jp",
		"岐阜.jp",
		"岡山.jp",
		"岩手.jp",
		"島根.jp",
		"広島.jp",
		"徳島.jp",
		"愛媛.jp",
		"愛知.jp",
		"政府.hk",
		"政府.香港",
		"敎育.hk",
		"教育.hk",
		"教育.香港",
		"新潟.jp",
		"東京.jp",
		"栃木.jp",
		"沖縄.jp",
		"滋賀.jp",
		"熊本.jp",
		"石川.jp",
		"神奈川.jp",
		"福井.jp",
		"福岡.jp",
		"福島.jp",
		"秋田.jp",
		"箇人.hk",
		"組織.hk",
		"組織.香港",
		"組织.hk",
		"網絡.cn",
		"網絡.hk",
		"網絡.香港",
		"網络.hk",
		"组織.hk",
		"组织.hk",
		"网絡.hk",
		"网络.cn",
		"网络.hk",
		"群馬.jp",
		"茨城.jp",
		"長崎.jp",
		"長野.jp",
		"青森.jp",
		"静岡.jp",
		"香川.jp",
		"高知.jp",
		"鳥取.jp",
		"鹿児島.jp"
	]);
	function domainFromUrl(input) {
		try {
			const url = new URL(input);
			if (url.protocol !== "http:" && url.protocol !== "https:") return null;
			const hostname = url.hostname.toLowerCase();
			if (hostname === "localhost" || hostname.endsWith(".local") || hostname.startsWith("[") && hostname.endsWith("]") || /^[\d.]+$/.test(hostname) || !hostname.includes(".")) return null;
			const parts = hostname.split(".");
			if (parts.length < 2) return null;
			let domain = parts.slice(-2).join(".");
			for (let len = Math.min(4, parts.length - 1); len >= 2; len--) {
				const candidate = parts.slice(-len).join(".");
				if (PUBLIC_SUFFIXES.has(candidate)) {
					domain = parts.slice(-(len + 1)).join(".");
					break;
				}
			}
			if (PUBLIC_SUFFIXES.has(domain) || domain === "tranco-list.eu") return null;
			return domain;
		} catch {
			return null;
		}
	}
	var SHORTCUT_LABEL = "Ctrl+Alt+S";
	function isTextEntry(target) {
		if (!(target instanceof Element)) return false;
		const tag = target.tagName;
		return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target instanceof HTMLElement && target.isContentEditable;
	}
	async function boot(url, services) {
		const domain = domainFromUrl(url);
		if (!domain) return;
		await services.touch(domain);
		services.collect(domain);
		services.registerMenu(`Show SiteOrbit (${SHORTCUT_LABEL})`, () => services.togglePanel(domain));
		services.registerMenu("Clear SiteOrbit Cache", () => services.clearCache());
		if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
		window.addEventListener("keydown", (event) => {
			if (!(event.code === "KeyS" || event.key?.toLowerCase() === "s") || !event.ctrlKey || !event.altKey || event.metaKey || event.repeat) return;
			if (isTextEntry(event.target)) return;
			event.preventDefault();
			services.togglePanel(domain);
		});
	}
	var TECH_RULES = [
		{
			name: "Next.js",
			category: "framework",
			test: (doc) => Boolean(doc.getElementById("__NEXT_DATA__") || doc.querySelector("script[src*=\"/_next/\"]") || doc.querySelector("link[href*=\"/_next/\"]"))
		},
		{
			name: "React",
			category: "framework",
			test: (doc, win) => Boolean(doc.querySelector("[data-reactroot], [data-react-helmet]") || doc.getElementById("__NEXT_DATA__") || win._reactRootContainer !== void 0 || doc.querySelector("script[src*=\"react.production\"], script[src*=\"react.development\"]"))
		},
		{
			name: "Nuxt.js",
			category: "framework",
			test: (doc, win) => Boolean(win.__NUXT__ !== void 0 || doc.getElementById("__NUXT_DATA__") || doc.querySelector("script[src*=\"/_nuxt/\"]"))
		},
		{
			name: "Vue.js",
			category: "framework",
			test: (doc, win) => Boolean(win.__VUE__ !== void 0 || win.__NUXT__ !== void 0 || doc.querySelector("[data-v-]") || doc.querySelector("script[src*=\"vue.global\"], script[src*=\"vue.runtime\"]"))
		},
		{
			name: "Svelte",
			category: "framework",
			test: (doc) => Boolean(doc.querySelector("[class*=\"svelte-\"]") || doc.getElementById("svelte") || doc.querySelector("script[src*=\"/svelte/\"]"))
		},
		{
			name: "Astro",
			category: "framework",
			test: (doc) => Boolean(doc.querySelector("astro-island, [data-astro-cid]") || doc.querySelector("meta[name=\"generator\"][content*=\"Astro\"]"))
		},
		{
			name: "Angular",
			category: "framework",
			test: (doc) => Boolean(doc.querySelector("[ng-version], [ng-app]") || doc.querySelector("script[src*=\"angular.js\"], script[src*=\"angular.min.js\"]"))
		},
		{
			name: "Remix",
			category: "framework",
			test: (_doc, win) => Boolean(win.__remixContext !== void 0 || win.__remixManifest !== void 0)
		},
		{
			name: "WordPress",
			category: "cms",
			test: (doc) => Boolean(doc.querySelector("link[href*=\"/wp-content/\"], script[src*=\"/wp-content/\"]") || doc.querySelector("meta[name=\"generator\"][content*=\"WordPress\"]"))
		},
		{
			name: "Shopify",
			category: "cms",
			test: (doc, win) => Boolean(win.Shopify !== void 0 || doc.querySelector("script[src*=\"cdn.shopify.com\"]"))
		},
		{
			name: "Webflow",
			category: "cms",
			test: (doc) => Boolean(doc.querySelector("[data-wf-page], [data-wf-site]") || doc.querySelector("script[src*=\"webflow.js\"]"))
		},
		{
			name: "Ghost",
			category: "cms",
			test: (doc) => Boolean(doc.querySelector("meta[name=\"generator\"][content*=\"Ghost\"]") || doc.querySelector("link[href*=\"ghost.org\"]"))
		},
		{
			name: "Tailwind CSS",
			category: "ui",
			test: (doc) => Boolean(doc.querySelector("[class*=\"flex-col\"], [class*=\"grid-cols-\"], [class*=\"items-center\"], [class*=\"justify-between\"]") && doc.querySelector("script[src*=\"tailwindcss\"], link[href*=\"tailwind\"]"))
		},
		{
			name: "Google Analytics",
			category: "analytics",
			test: (doc) => Boolean(doc.querySelector("script[src*=\"googletagmanager.com\"], script[src*=\"google-analytics.com\"]"))
		},
		{
			name: "PostHog",
			category: "analytics",
			test: (doc, win) => Boolean(win.posthog !== void 0 || doc.querySelector("script[src*=\"posthog.com\"], script[src*=\"us.i.posthog.com\"], script[src*=\"eu.i.posthog.com\"]"))
		},
		{
			name: "Plausible",
			category: "analytics",
			test: (doc, win) => Boolean(win.plausible !== void 0 || doc.querySelector("script[src*=\"plausible.io\"]"))
		},
		{
			name: "Mixpanel",
			category: "analytics",
			test: (doc, win) => Boolean(win.mixpanel !== void 0 || doc.querySelector("script[src*=\"cdn.mxpnl.com\"]"))
		},
		{
			name: "Sentry",
			category: "observability",
			test: (doc, win) => Boolean(win.Sentry !== void 0 || doc.querySelector("script[src*=\"sentry.io\"], script[src*=\"sentry-cdn.com\"]"))
		},
		{
			name: "Cloudflare",
			category: "cdn",
			test: (doc) => Boolean(doc.querySelector("script[src*=\"cloudflareinsights.com\"], script[src*=\"challenges.cloudflare.com\"]"))
		}
	];
	function detectTech(doc = document, win = window) {
		const detected = [];
		const seen = new Set();
		for (const rule of TECH_RULES) try {
			if (rule.test(doc, win) && !seen.has(rule.name)) {
				seen.add(rule.name);
				detected.push({
					name: rule.name,
					category: rule.category
				});
			}
		} catch {}
		return detected;
	}
	var DEFAULT_CONFIG = {
		lang: void 0,
		message: void 0,
		abortEarly: void 0,
		abortPipeEarly: void 0
	};
	function getGlobalConfig(config$1) {
		if (!config$1 && true) return DEFAULT_CONFIG;
		return {
			lang: config$1?.lang ?? void 0,
			message: config$1?.message,
			abortEarly: config$1?.abortEarly ?? void 0,
			abortPipeEarly: config$1?.abortPipeEarly ?? void 0
		};
	}
	function _stringify(input) {
		const type = typeof input;
		if (type === "string") return `"${input}"`;
		if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
		if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
		return type;
	}
	function _addIssue(context, label, dataset, config$1, other) {
		const input = other && "input" in other ? other.input : dataset.value;
		const expected = other?.expected ?? context.expects ?? null;
		const received = other?.received ?? _stringify(input);
		const issue = {
			kind: context.kind,
			type: context.type,
			input,
			expected,
			received,
			message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
			requirement: context.requirement,
			path: other?.path,
			issues: other?.issues,
			lang: config$1.lang,
			abortEarly: config$1.abortEarly,
			abortPipeEarly: config$1.abortPipeEarly
		};
		const isSchema = context.kind === "schema";
		const message$1 = other?.message ?? context.message ?? (context.reference, issue.lang, void 0) ?? (isSchema ? (issue.lang, void 0) : null) ?? config$1.message ?? (issue.lang, void 0);
		if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
		if (isSchema) dataset.typed = false;
		if (dataset.issues) dataset.issues.push(issue);
		else dataset.issues = [issue];
	}
	function _standardSchema(schema) {
		schema["~standard"] = {
			version: 1,
			vendor: "valibot",
			validate: (value$1) => schema["~run"]({ value: value$1 }, getGlobalConfig())
		};
		return schema;
	}
	function getFallback(schema, dataset, config$1) {
		return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
	}
	function getDefault(schema, dataset, config$1) {
		return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
	}
	function array(item, message$1) {
		return _standardSchema({
			kind: "schema",
			type: "array",
			reference: array,
			expects: "Array",
			async: false,
			item,
			message: message$1,
			"~run"(dataset, config$1) {
				const input = dataset.value;
				if (Array.isArray(input)) {
					dataset.typed = true;
					dataset.value = [];
					for (let key = 0; key < input.length; key++) {
						const value$1 = input[key];
						const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
						if (itemDataset.issues) {
							const pathItem = {
								type: "array",
								origin: "value",
								input,
								key,
								value: value$1
							};
							for (const issue of itemDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = itemDataset.issues;
							if (config$1.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!itemDataset.typed) dataset.typed = false;
						dataset.value.push(itemDataset.value);
					}
				} else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function number(message$1) {
		return _standardSchema({
			kind: "schema",
			type: "number",
			reference: number,
			expects: "number",
			async: false,
			message: message$1,
			"~run"(dataset, config$1) {
				if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
				else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function object(entries$1, message$1) {
		return _standardSchema({
			kind: "schema",
			type: "object",
			reference: object,
			expects: "Object",
			async: false,
			entries: entries$1,
			message: message$1,
			"~run"(dataset, config$1) {
				const input = dataset.value;
				if (input && typeof input === "object") {
					dataset.typed = true;
					dataset.value = {};
					for (const key in this.entries) {
						const valueSchema = this.entries[key];
						if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
							const value$1 = key in input ? input[key] : getDefault(valueSchema);
							const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
							if (valueDataset.issues) {
								const pathItem = {
									type: "object",
									origin: "value",
									input,
									key,
									value: value$1
								};
								for (const issue of valueDataset.issues) {
									if (issue.path) issue.path.unshift(pathItem);
									else issue.path = [pathItem];
									dataset.issues?.push(issue);
								}
								if (!dataset.issues) dataset.issues = valueDataset.issues;
								if (config$1.abortEarly) {
									dataset.typed = false;
									break;
								}
							}
							if (!valueDataset.typed) dataset.typed = false;
							dataset.value[key] = valueDataset.value;
						} else if (valueSchema.fallback !== void 0) dataset.value[key] = getFallback(valueSchema);
						else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
							_addIssue(this, "key", dataset, config$1, {
								input: void 0,
								expected: `"${key}"`,
								path: [{
									type: "object",
									origin: "key",
									input,
									key,
									value: input[key]
								}]
							});
							if (config$1.abortEarly) break;
						}
					}
				} else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function optional(wrapped, default_) {
		return _standardSchema({
			kind: "schema",
			type: "optional",
			reference: optional,
			expects: `(${wrapped.expects} | undefined)`,
			async: false,
			wrapped,
			default: default_,
			"~run"(dataset, config$1) {
				if (dataset.value === void 0) {
					if (this.default !== void 0) dataset.value = getDefault(this, dataset, config$1);
					if (dataset.value === void 0) {
						dataset.typed = true;
						return dataset;
					}
				}
				return this.wrapped["~run"](dataset, config$1);
			}
		});
	}
	function string(message$1) {
		return _standardSchema({
			kind: "schema",
			type: "string",
			reference: string,
			expects: "string",
			async: false,
			message: message$1,
			"~run"(dataset, config$1) {
				if (typeof dataset.value === "string") dataset.typed = true;
				else _addIssue(this, "type", dataset, config$1);
				return dataset;
			}
		});
	}
	function safeParse(schema, input, config$1) {
		const dataset = schema["~run"]({ value: input }, getGlobalConfig(config$1));
		return {
			typed: dataset.typed,
			success: !dataset.issues,
			output: dataset.value,
			issues: dataset.issues
		};
	}
	var DohResponseSchema = object({
		Status: number(),
		Answer: optional(array(object({
			name: string(),
			type: number(),
			data: string(),
			TTL: optional(number())
		})))
	});
	function classifyNameserver(nameservers) {
		const joined = nameservers.join(" ").toLowerCase();
		if (joined.includes("cloudflare.com")) return "Cloudflare DNS";
		if (joined.includes("awsdns")) return "AWS Route 53";
		if (joined.includes("nsone.net") || joined.includes("p08.nsone")) return "NS1 / IBM";
		if (joined.includes("googledomains") || joined.includes("google.com")) return "Google Cloud DNS";
		if (joined.includes("akam") || joined.includes("akadns")) return "Akamai Edge DNS";
		if (joined.includes("azure-dns")) return "Azure DNS";
		if (joined.includes("dynect.net")) return "Oracle Dyn";
		if (joined.includes("digitalocean.com")) return "DigitalOcean DNS";
		if (joined.includes("dnsimple.com")) return "DNSimple";
		if (joined.includes("he.net")) return "Hurricane Electric";
		if (joined.includes("linode.com")) return "Linode DNS";
		if (nameservers.length > 0) return nameservers[0].replace(/\.$/, "").split(".").slice(-2).join(".") || null;
		return null;
	}
	function classifyMailProvider(mailServers) {
		const joined = mailServers.join(" ").toLowerCase();
		if (joined.includes("google.com") || joined.includes("googlemail.com") || joined.includes("aspmx")) return "Google Workspace";
		if (joined.includes("outlook.com") || joined.includes("microsoft.com") || joined.includes("protection.outlook")) return "Microsoft 365";
		if (joined.includes("protonmail") || joined.includes("proton.me")) return "Proton Mail";
		if (joined.includes("zoho.com") || joined.includes("zoho.eu")) return "Zoho Mail";
		if (joined.includes("fastmail.com")) return "Fastmail";
		if (joined.includes("mimecast.com")) return "Mimecast Secure Mail";
		if (joined.includes("cf-emailsecurity") || joined.includes("cloudflare")) return "Cloudflare Email";
		if (joined.includes("messagelabs.com")) return "Symantec MessageLabs";
		if (joined.includes("amazonaws.com") || joined.includes("amazon-smtp")) return "Amazon SES";
		if (mailServers.length > 0) return mailServers[0].replace(/^\d+\s+/, "").replace(/\.$/, "").split(".").slice(-2).join(".") || null;
		return null;
	}
	async function fetchDnsInfo(domain, http) {
		const dohUrl = (type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;
		const [nsRes, mxRes, aaaaRes] = await Promise.allSettled([
			http.get(dohUrl("NS"), 8e3),
			http.get(dohUrl("MX"), 8e3),
			http.get(dohUrl("AAAA"), 8e3)
		]);
		const parseDoh = (res) => {
			if (res.status !== "fulfilled" || res.value.status !== 200) return [];
			try {
				const val = safeParse(DohResponseSchema, JSON.parse(res.value.text));
				return val.success && val.output.Answer ? val.output.Answer.map((a) => a.data) : [];
			} catch {
				return [];
			}
		};
		const nsRecords = parseDoh(nsRes).map((s) => s.replace(/\.$/, ""));
		const mxRecords = parseDoh(mxRes).map((s) => s.replace(/^\d+\s+/, "").replace(/\.$/, ""));
		const aaaaRecords = parseDoh(aaaaRes);
		if (!nsRecords.length && !mxRecords.length && !aaaaRecords.length) return null;
		return {
			nameservers: nsRecords,
			nameserverProvider: classifyNameserver(nsRecords),
			mailServers: mxRecords,
			mailProvider: classifyMailProvider(mxRecords),
			hasIpv6: aaaaRecords.length > 0
		};
	}
	var TrancoResponseSchema = object({
		ranks: array(object({
			date: string(),
			rank: number()
		})),
		domain: string()
	});
	function extractTrancoStats(raw, domain) {
		let parsed;
		if (typeof raw === "string") try {
			parsed = JSON.parse(raw);
		} catch {
			return {
				ok: false,
				code: "malformed-json"
			};
		}
		else parsed = raw;
		const result = safeParse(TrancoResponseSchema, parsed);
		if (!result.success) return {
			ok: false,
			code: "schema-mismatch"
		};
		const ranks = [...result.output.ranks].sort((a, b) => b.date.localeCompare(a.date));
		if (!ranks.length) return {
			ok: false,
			code: "no-data"
		};
		const latestRank = ranks[0].rank;
		const oldestRank = ranks[ranks.length - 1].rank;
		return {
			ok: true,
			stats: {
				domain,
				globalRank: latestRank,
				globalRankChange: ranks.length > 1 ? oldestRank - latestRank : null,
				rankHistory: ranks,
				capturedAt: Date.now()
			}
		};
	}
	var HttpRequestError = class extends Error {
		code;
		constructor(code) {
			super(code);
			this.code = code;
			this.name = "HttpRequestError";
		}
	};
	function extractPerformanceMetrics(win = window) {
		try {
			if (typeof win.performance === "undefined" || typeof win.performance.getEntriesByType !== "function") return null;
			const nav = win.performance.getEntriesByType("navigation")[0];
			const resources = win.performance.getEntriesByType("resource");
			if (!nav) return {
				ttfbMs: null,
				loadTimeMs: null,
				transferBytes: null,
				protocol: null,
				resourceCount: resources.length + 1
			};
			const ttfb = nav.responseStart > 0 && nav.requestStart > 0 ? Math.max(0, Math.round(nav.responseStart - nav.requestStart)) : null;
			const loadTime = nav.loadEventEnd > 0 && nav.startTime >= 0 ? Math.max(0, Math.round(nav.loadEventEnd - nav.startTime)) : nav.duration > 0 ? Math.round(nav.duration) : null;
			let protocol = null;
			if (nav.nextHopProtocol) {
				const p = nav.nextHopProtocol.toLowerCase();
				if (p.startsWith("h3") || p.includes("quic")) protocol = "HTTP/3";
				else if (p.startsWith("h2")) protocol = "HTTP/2";
				else if (p === "http/1.1" || p === "http/1.0") protocol = p.toUpperCase();
				else protocol = nav.nextHopProtocol;
			}
			return {
				ttfbMs: ttfb,
				loadTimeMs: loadTime,
				transferBytes: nav.transferSize > 0 ? nav.transferSize : null,
				protocol,
				resourceCount: resources.length + 1
			};
		} catch {
			return null;
		}
	}
	function faviconUrl(domain) {
		return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
	}
	function extractSiteMeta(domain, doc = document) {
		let description = null;
		try {
			const metaDesc = doc.querySelector("meta[property=\"og:description\"]") || doc.querySelector("meta[name=\"twitter:description\"]") || doc.querySelector("meta[name=\"description\"]");
			if (metaDesc instanceof HTMLMetaElement && metaDesc.content) description = metaDesc.content.trim().slice(0, 180);
		} catch {}
		return {
			description,
			faviconUrl: faviconUrl(domain)
		};
	}
	var REQUEST_TIMEOUT_MS = 15e3;
	var LOCK_TTL_MS = 3e4;
	var Collector = class {
		repository;
		http;
		ownerFactory;
		inFlight = new Map();
		listeners = new Map();
		states = new Map();
		constructor(repository, http, ownerFactory) {
			this.repository = repository;
			this.http = http;
			this.ownerFactory = ownerFactory;
		}
		subscribe(domain, listener) {
			const domainListeners = this.listeners.get(domain) ?? new Set();
			domainListeners.add(listener);
			this.listeners.set(domain, domainListeners);
			listener(this.states.get(domain) ?? {
				status: "idle",
				record: null
			});
			return () => {
				domainListeners.delete(listener);
				if (domainListeners.size === 0) this.listeners.delete(domain);
			};
		}
		collect(domain, force = false) {
			const existing = force ? void 0 : this.inFlight.get(domain);
			if (existing) return existing;
			const request = this.run(domain, force).finally(() => this.inFlight.delete(domain));
			this.inFlight.set(domain, request);
			return request;
		}
		async run(domain, force) {
			const current = await this.repository.get(domain) ?? await this.repository.touch(domain);
			if (!this.repository.needsCollection(current, force)) {
				this.emit(domain, {
					status: "ready",
					record: current
				});
				return current;
			}
			this.emit(domain, {
				status: "loading",
				record: current
			});
			const owner = this.ownerFactory();
			if (!await this.repository.acquireLock(domain, owner, LOCK_TTL_MS)) return await this.waitForWinner(domain, current);
			try {
				const [trancoResult, dnsInfo] = await Promise.all([this.http.get(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`, REQUEST_TIMEOUT_MS), fetchDnsInfo(domain, this.http).catch(() => null)]);
				const isCurrentPage = typeof window !== "undefined" && typeof document !== "undefined" && domainFromUrl(window.location.href) === domain;
				const live = {
					dns: dnsInfo,
					tech: isCurrentPage ? detectTech() : [],
					performance: isCurrentPage ? extractPerformanceMetrics() : null,
					...isCurrentPage ? extractSiteMeta(domain) : {
						description: null,
						faviconUrl: faviconUrl(domain)
					}
				};
				const unranked = trancoResult.status === 404;
				const extracted = unranked ? null : extractTrancoStats(trancoResult.text, domain);
				if (!unranked && trancoResult.status !== 200) return await this.fail(domain, `http-${trancoResult.status}`);
				if (extracted && !extracted.ok && extracted.code !== "no-data") return await this.fail(domain, extracted.code);
				const stats = extracted?.ok ? {
					...extracted.stats,
					...live
				} : {
					domain,
					globalRank: null,
					globalRankChange: null,
					rankHistory: [],
					capturedAt: Date.now(),
					...live
				};
				const record = extracted?.ok ? await this.repository.saveSuccess(domain, stats) : await this.repository.saveNoData(domain, stats);
				this.emit(domain, {
					status: "ready",
					record
				});
				return record;
			} catch (error) {
				return await this.fail(domain, error instanceof HttpRequestError ? error.code : "network-error");
			} finally {
				await this.repository.releaseLock(domain, owner);
			}
		}
		async fail(domain, code) {
			const record = await this.repository.saveFailure(domain, code);
			this.emit(domain, {
				status: "error",
				record,
				code
			});
			return record;
		}
		async waitForWinner(domain, baseline) {
			const signature = `${baseline.status}:${baseline.capturedAt}:${baseline.retryAfter}:${baseline.errorCode}`;
			let latest = baseline;
			for (let attempt = 0; attempt < 300; attempt++) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				latest = await this.repository.get(domain) ?? latest;
				if (`${latest.status}:${latest.capturedAt}:${latest.retryAfter}:${latest.errorCode}` !== signature || !await this.repository.isLocked(domain)) break;
			}
			if (latest.status === "error") this.emit(domain, {
				status: "error",
				record: latest,
				code: latest.errorCode ?? "collection-failed"
			});
			else this.emit(domain, {
				status: "ready",
				record: latest
			});
			return latest;
		}
		emit(domain, state) {
			this.states.set(domain, state);
			for (const listener of this.listeners.get(domain) ?? []) listener(state);
		}
	};
	var _GM_deleteValue = (() => typeof GM_deleteValue != "undefined" ? GM_deleteValue : void 0)();
	var _GM_download = (() => typeof GM_download != "undefined" ? GM_download : void 0)();
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_listValues = (() => typeof GM_listValues != "undefined" ? GM_listValues : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
	var gmStorage = {
		async get(key, fallback) {
			return await Promise.resolve(_GM_getValue(key, fallback));
		},
		async set(key, value) {
			await Promise.resolve(_GM_setValue(key, value));
		},
		async delete(key) {
			await Promise.resolve(_GM_deleteValue(key));
		},
		async keys() {
			return await Promise.resolve(_GM_listValues());
		}
	};
	var gmHttp = { get(url, timeoutMs) {
		return new Promise((resolve, reject) => {
			_GM_xmlhttpRequest({
				method: "GET",
				url,
				timeout: timeoutMs,
				anonymous: true,
				headers: { Accept: "application/dns-json, application/json, */*;q=0.5" },
				onload: (response) => resolve({
					status: response.status,
					text: response.responseText
				}),
				onabort: () => reject(new HttpRequestError("request-aborted")),
				onerror: () => reject(new HttpRequestError("request-failed")),
				ontimeout: () => reject(new HttpRequestError("request-timeout"))
			});
		});
	} };
	function registerMenu(label, callback) {
		_GM_registerMenuCommand(label, () => void callback());
	}
	function downloadJson(name, content) {
		_GM_download({
			name,
			saveAs: true,
			url: `data:application/json;charset=utf-8,${encodeURIComponent(content)}`
		});
	}
	var n;
	var t$1;
	var r$1;
	var u$2;
	var f$2;
	var o$2;
	var e$1;
	var l$1;
	var c$1;
	var a$1;
	var h$1 = {};
	var p$1 = [];
	var v$1 = /^m(i|n|o|s|text|space)$/;
	var y$1 = Array.isArray;
	var d$1 = p$1.slice;
	var w = Object.assign;
	function _$1(n) {
		n && n.parentNode && n.remove();
	}
	function b$1(i, r, u, f, o) {
		var e = {
			type: i,
			props: r,
			key: u,
			ref: f,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: o || ++t$1,
			__i: -1,
			__u: 0
		};
		return !o && n.vnode && n.vnode(e), e;
	}
	function M(n) {
		return n.children;
	}
	function $(n, t) {
		this.props = n, this.context = t, this.__g = 0;
	}
	function x(n, t) {
		if (null == t) return n.__ ? x(n.__, n.__i + 1) : null;
		for (var i; t < n.__k.length; t++) if ((i = n.__k[t]) && i.__e) return i.__e;
		return "function" != typeof n.type || n.props.__P ? null : x(n);
	}
	function S(n) {
		if ((n = n.__) && n.__c && !n.props.__P) return n.__e = null, n.__k.some(function(t) {
			return t && (n.__e = t.__e);
		}), S(n);
	}
	function C$1(t) {
		(8 & t.__g || !(t.__g |= 8) || !r$1.push(t) || f$2++) && u$2 == n.debounceRendering || ((u$2 = n.debounceRendering) || queueMicrotask)(j);
	}
	function j() {
		var t, i, u, e, l, c, a, s, h;
		try {
			for (i = 1; r$1.length;) r$1.length > i && r$1.sort(o$2), t = r$1.shift(), i = r$1.length, 8 & t.__g && (e = void 0, l = void 0, c = (l = (u = t).__v).__e, a = [], s = [], (h = u.__P) && ((e = w({ constructor: void 0 }, l)).__v = l.__v + 1, n.vnode && n.vnode(e), N(h, e, l, u.__n, h.namespaceURI, 32 & l.__u ? [c] : null, a, c || x(l), 32 & l.__u, s), e.__v = l.__v, e.__.__k[e.__i] = e, z$1(a, e, s), l.__ = l.__e = null, e.__e != c && S(e)));
		} finally {
			r$1.length = f$2 = 0;
		}
	}
	function L(n, t, i, r, u, f, o, e, l, c, a) {
		var s, v, y, d, w, _, g = r.__k || p$1, k = t.length;
		for (l = H(i, t, g, l, k), s = 0; s < k; s++) null != (y = i.__k[s]) && (v = ~y.__i && g[y.__i] || h$1, y.__i = s, _ = N(n, y, v, u, f, o, e, l, c, a), d = y.__e, (v.ref != y.ref || 8 & v.__u) && (v.ref && D$1(v.ref, null, y, v), y.ref && a.push(y.ref, y.__c || d, y)), w = w || d, 4 & y.__u ? (l = I(y, l, n, !v.__v), v.__e && (v.__e = null)) : "function" == typeof y.type && void 0 !== _ ? l = _ : d && (l = d.nextSibling), y.__u &= -7);
		return i.__e = w, l;
	}
	function H(n, t, i, r, u) {
		var f, o, e, l, c, a, s, h, p, v, d = i.length, w = d, _ = 0, g = !1, k = n.__k = Array(u);
		for (f = 0; f < u; f++) null != (o = t[f]) && "boolean" != typeof o && "function" != typeof o ? ("object" != typeof o || o.constructor == String ? o = k[f] = b$1(null, o) : y$1(o) ? o = k[f] = b$1(M, { children: o }) : void 0 === o.constructor && o.__b ? o = k[f] = b$1(o.type, o.props, o.key, o.ref, o.__v) : k[f] = o, l = f + _, o.__ = n, o.__b = n.__b + 1, e = null, ~(c = o.__i = O(o, i, l, w)) && (w--, (e = i[c]) && (e.__u |= 2)), e && e.__v ? (o.__u |= 2, c == l - 1 ? _-- : c == l + 1 ? _++ : c != l && (c > l ? _-- : _++, g = !0)) : (~c || (u > d ? _-- : u < d && _++), "function" != typeof o.type && (o.__u |= 4))) : k[f] = null;
		if (g) {
			for (a = [], s = [], f = 0; f < u; f++) if ((o = k[f]) && 2 & o.__u) {
				for (h = 0, p = a.length; h < p;) a[v = h + p >> 1] < o.__i ? h = v + 1 : p = v;
				a[h] = o.__i, s[f] = h + 1;
			}
			for (_ = a.length; f--;) s[f] && (s[f] == _ ? _-- : k[f].__u |= 4);
		}
		if (w) for (f = 0; f < d; f++) !(e = i[f]) || 2 & e.__u || (e.__e == r && (r = x(e)), E$1(e, e));
		return r;
	}
	function I(n, t, i, r) {
		var u, f, o;
		if ("function" == typeof n.type) {
			if (n.props.__P) return t;
			if (u = n.__k) for (f = 0; f < u.length; f++) u[f] && (u[f].__ = n, t = I(u[f], t, i, !1));
			return t;
		}
		for (t && !t.parentNode && (t = x(n)) && !t.parentNode && (t = null), o = t; o && 8 == o.nodeType;) o = o.nextSibling;
		for (n.__e != o && (!r && i.moveBefore && n.__e.parentNode ? i.moveBefore(n.__e, t) : i.insertBefore(n.__e, t || null)), t = n.__e; (t = t && t.nextSibling) && 8 == t.nodeType;);
		return t;
	}
	function O(n, t, i, r) {
		var u, f, o, e = n.key, l = n.type, c = t[i], a = c && !(2 & c.__u);
		if (null === c && null == e || a && e == c.key && l == c.type) return i;
		if (r > (a ? 1 : 0)) {
			for (u = i - 1, f = i + 1; u >= 0 || f < t.length;) if ((c = t[o = u >= 0 ? u-- : f++]) && !(2 & c.__u) && e == c.key && l == c.type) return o;
		}
		return -1;
	}
	function P(n, t, i) {
		i ??= "", "-" == t[0] ? n.setProperty(t, i) : n[t] = i;
	}
	function T$1(n, t, i, r, u) {
		var f, o;
		n: if ("style" == t) if ("string" == typeof i) n.style.cssText = i;
		else {
			if ("string" == typeof r && (n.style.cssText = r = ""), r) for (t in r) i && t in i || P(n.style, t, "");
			if (i) for (t in i) r && i[t] == r[t] || P(n.style, t, i[t]);
		}
		else if ("o" == t[0] && "n" == t[1]) (n.__e || (n.__e = {}))[t] = i, i && r || (o = a$1[t] || (a$1[t] = q(t)), (n.__a || (n.__a = {}))[t] = c$1, f = t != (t = t.replace(l$1, "$1")), (t = t.slice(2))[0] < "a" && (t = t.toLowerCase()), i ? n.addEventListener(t, o, f) : n.removeEventListener(t, o, f));
		else {
			if ("http://www.w3.org/2000/svg" == u) t = t.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
			else if ("width" != t && "height" != t && "href" != t && "list" != t && "form" != t && "tabIndex" != t && "download" != t && "rowSpan" != t && "colSpan" != t && "role" != t && "popover" != t && t in n) try {
				n[t] = null == i ? "" : i;
				break n;
			} catch (n) {}
			"function" == typeof i || (null == i || !1 === i && "-" != t[4] ? n.removeAttribute(t) : n.setAttribute(t, "popover" == t && 1 == i ? "" : i));
		}
	}
	function q(t) {
		return function(i) {
			if (this.__e) {
				var r = this.__e[t];
				if (null == i[e$1]) i[e$1] = c$1++;
				else if (i[e$1] < this.__a[t]) return;
				return r(n.event ? n.event(i) : i);
			}
		};
	}
	function N(t, i, r, u, f, o, e, l, c, a) {
		var s, h, v, d, g, k, b, m, S, C, j, H, I, A, O, P, T, q, N, z, D = i.type;
		if (void 0 !== i.constructor) return null;
		if (128 & r.__u && (c = 32 & r.__u, s = r.__c.__z)) {
			if (i.__u |= c, h = o = [], 8 == s.nodeType) for (v = 1, d = s.nextSibling; d; d = d.nextSibling) {
				if (8 == d.nodeType) {
					if (d.data.startsWith("$s")) v++;
					else if (d.data.startsWith("/$s") && !--v) break;
				}
				o.push(d);
			}
			else o.push(s);
			l = o[0];
		}
		(s = n.__b) && s(i);
		n: if ("function" == typeof D) {
			g = e.length;
			try {
				if (C = i.props, j = (s = D.prototype) && s.render, H = (s = D.contextType) && u[s.__c], I = s ? H ? H.props.value : s.__ : u, r.__c ? 2 & (k = i.__c = r.__c).__g && (k.__g |= 1) : (j ? i.__c = k = new D(C, I) : (i.__c = k = new $(C, I), k.constructor = D, k.render = F), H && H.sub(k), k.state || (k.state = {}), k.__n = u, k.__g |= 8, k.__h = [], k.__k = []), j && (k.__s || (k.__s = k.state), D.getDerivedStateFromProps && (k.__s == k.state && (k.__s = w({}, k.__s)), w(k.__s, D.getDerivedStateFromProps(C, k.__s)))), b = k.props, m = k.state, k.__v = i, r.__c) {
					if (j && !D.getDerivedStateFromProps && C !== b && k.componentWillReceiveProps && k.componentWillReceiveProps(C, I), i.__v == r.__v && !(8 & k.__g) || !(4 & k.__g) && k.shouldComponentUpdate && !1 === k.shouldComponentUpdate(C, k.__s, I)) {
						i.__v != r.__v && (k.props = C, k.state = k.__s, k.__g &= -9), i.__e = r.__e, i.__k = r.__k, i.__k.some(function(n) {
							n && (n.__ = i);
						}), p$1.push.apply(k.__h, k.__k), k.__k = [], k.__h.length && e.push(k), l = x(r);
						break n;
					}
					k.componentWillUpdate && k.componentWillUpdate(C, k.__s, I), j && k.componentDidUpdate && k.__h.push(function() {
						k.componentDidUpdate(b, m, S);
					});
				} else j && !D.getDerivedStateFromProps && k.componentWillMount && k.componentWillMount(), j && k.componentDidMount && k.__h.push(k.componentDidMount);
				if (k.context = I, k.props = C, k.__P = t, k.__g &= -5, A = n.__r, O = 0, j) k.state = k.__s, k.__g &= -9, A && A(i), s = k.render(k.props, k.state, k.context), p$1.push.apply(k.__h, k.__k), k.__k = [];
				else do
					k.__g &= -9, A && A(i), s = k.render(k.props, k.state, k.context), k.state = k.__s;
				while (8 & k.__g && ++O < 25);
				k.state = k.__s, k.getChildContext && (u = w({}, u, k.getChildContext())), j && r.__c && k.getSnapshotBeforeUpdate && (S = k.getSnapshotBeforeUpdate(b, m)), P = s && s.type === M && null == s.key ? s.props.children : s, C.__P && (s = l, f = (t = C.__P).namespaceURI, c = o = null, r.props && r.props.__P != t && (r.__k.some(function(n) {
					n && E$1(n, n);
				}), r.__k = null), l = r.__k ? x(r, 0) : null), l = L(t, y$1(P) ? P : [P], i, r, u, f, o, e, l, c, a), C.__P && (i.__e = null, l = s), i.__u &= -161, 128 & r.__u && (k.__z = null), h && h.some(_$1), k.__h.length && e.push(k), 1 & k.__g && (k.__g &= -4);
			} catch (t) {
				if (e.length = g, i.__v = null, c || o) if (t.then) {
					if (T = 0, i.__u |= c ? 160 : 128, o) {
						for (~(N = o.indexOf(l || void 0)) || (N = o.length); (z = o[N - 1]) && 8 == z.nodeType;) N--;
						for (; N < o.length; N++) if (z = o[N]) {
							if (o[N] = null, 8 == z.nodeType) {
								if (z.data.startsWith("$s")) T++ || (q = z);
								else if (T && z.data.startsWith("/$s") && !--T) {
									l = z;
									break;
								}
							} else if (!T) break;
						}
					}
					if (!q) {
						for (; l && 8 == l.nodeType && l.nextSibling;) l = l.nextSibling;
						q = l;
					}
					i.__c.__z || (i.__c.__z = q), i.__e = l;
				} else o && o.some(_$1);
				else i.__e = r.__e;
				i.__k || (i.__k = r.__k || []), t.then || V(i), n.__e(t, i, r);
			}
		} else l = i.__e = B$1(r.__e, i, r, u, f, o, e, c, a, t);
		return (s = n.diffed) && s(i), 128 & i.__u ? void 0 : l;
	}
	function V(n) {
		n && (n.__c && (n.__c.__g |= 4), n.__k && n.__k.some(V));
	}
	function z$1(t, i, r) {
		for (var u = 0; u < r.length;) D$1(r[u++], r[u++], r[u++]);
		n.__c && n.__c(i, t), t.some(function(i) {
			try {
				t = i.__h, i.__h = [], t.some(function(n) {
					n.call(i);
				});
			} catch (t) {
				n.__e(t, i.__v);
			}
		});
	}
	function B$1(t, i, r, u, f, o, e, l, c, a) {
		var s, p, w, g, k, b, m, M, $, S = r.props || h$1, C = i.props, j = i.type;
		if ("svg" == j ? f = "http://www.w3.org/2000/svg" : "math" == j ? f = "http://www.w3.org/1998/Math/MathML" : f || (f = "http://www.w3.org/1999/xhtml"), o) {
			for (s = 0; s < o.length; s++) if ((k = o[s]) && (j ? k.localName == j : 3 == k.nodeType)) {
				t = k, o[s] = null;
				break;
			}
		}
		if (!t) {
			if (M = a.ownerDocument || document, !j) return M.createTextNode(C);
			t = M.createElementNS(f, j, C.is && C), l && (n.__m && n.__m(i, o), l = !1), o = null;
		}
		if (j) {
			if (a = "template" == j ? t.content : t, o = "textarea" == j && null != C.defaultValue ? null : o && d$1.call(a.childNodes), !l && o) for (S = {}, s = 0; s < t.attributes.length; s++) S[(k = t.attributes[s]).name] = k.value;
			for (s in S) k = S[s], "dangerouslySetInnerHTML" == s ? w = k : "children" == s || s in C || "value" == s && "defaultValue" in C || "checked" == s && "defaultChecked" in C || T$1(t, s, null, k, f);
			for (s in $ = 1 & r.__u, C) k = C[s], "children" == s ? g = k : "dangerouslySetInnerHTML" == s ? p = k : "value" == s ? b = k : "checked" == s ? m = k : l && "function" != typeof k || !(S[s] !== k || $ && null != k) || T$1(t, s, k, S[s], f);
			p ? (l || w && (p.__html == w.__html || p.__html == t.innerHTML) || (t.innerHTML = p.__html), i.__k = []) : (w && (t.textContent = ""), ("foreignObject" == j || "http://www.w3.org/1998/Math/MathML" == f && v$1.test(j)) && (f = "http://www.w3.org/1999/xhtml"), L(a, y$1(g) ? g : [g], i, r, u, f, o, e, o ? o[0] : r.__k && x(r, 0), l, c), o && o.some(_$1)), l && "textarea" != j || (s = "value", "progress" == j && null == b ? t.removeAttribute(s) : null == b || b === t[s] && ("progress" != j || b) || T$1(t, s, b, S[s], f), s = "checked", null != m && m != t[s] && T$1(t, s, m, S[s], f));
		} else S === C || l && t.data == C || (t.data = C);
		return t;
	}
	function D$1(t, i, r, u) {
		try {
			"function" == typeof t ? i ? i.__x = t(i) || 1 : u && (u = u.__c || u.__e) && (i = u.__x) && (u.__x = null, "function" == typeof i ? i() : t(null)) : t.current = i;
		} catch (t) {
			n.__e(t, r);
		}
	}
	function E$1(t, i, r) {
		var u, f;
		if (n.unmount && n.unmount(t), !(u = t.ref) || u.current && u.current != t.__e || D$1(u, null, i, t), u = t.__c) {
			if (u.componentWillUnmount) try {
				u.componentWillUnmount();
			} catch (t) {
				n.__e(t, i);
			}
			u.__P = u.__n = null;
		}
		if (u = t.__k) for (f = 0; f < u.length; f++) u[f] && E$1(u[f], i, "function" != typeof t.type || r && !t.props.__P);
		(u = t.__e) && (r || _$1(u), u.__e && (u.__e = null)), t.__e = t.__c = t.__ = null;
	}
	function F(n, t, i) {
		return this.constructor(n, i);
	}
	function G$1(t, i) {
		var r, u, f, o;
		n.__ && n.__(t, i), 9 == i.nodeType && (i = i.documentElement), u = (r = t && 32 & t.__u) ? null : i.__k, i.__k = b$1(M, { children: [t] }), f = [], o = [], N(i, i.__k, u || h$1, h$1, i.namespaceURI, u ? null : i.firstChild ? d$1.call(i.childNodes) : null, f, u ? u.__e : i.firstChild, r, o), z$1(f, i.__k, o), i.__k.props.children = null;
	}
	n = { __e: function(n, t, i, r) {
		for (var u, o, e; t = t.__;) if ((u = t.__c) && !(1 & u.__g)) {
			u.__g |= 4;
			try {
				if ((o = u.constructor) && o.getDerivedStateFromError && (u.setState(o.getDerivedStateFromError(n)), e = 8 & u.__g), u.componentDidCatch && (u.componentDidCatch(n, r || {}), e = 8 & u.__g), e) return void (u.__g |= 2);
			} catch (t) {
				n = t, e = 0;
			}
		}
		throw f$2 = 0, n;
	} }, t$1 = 0, $.prototype.setState = function(n, t) {
		var i = this.__s;
		i && i != this.state || (i = this.__s = w({}, this.state)), "function" == typeof n && (n = n(w({}, i), this.props)), n && (w(i, n), this.__v && (t && this.__k.push(t), C$1(this)));
	}, $.prototype.forceUpdate = function(n) {
		this.__v && (this.__g |= 4, n && this.__h.push(n), C$1(this));
	}, $.prototype.render = M, r$1 = [], f$2 = 0, o$2 = function(n, t) {
		return n.__v.__b - t.__v.__b;
	}, e$1 = Symbol(), l$1 = /(PointerCapture)$|Capture$/i, c$1 = 0, a$1 = {};
	var t;
	var r;
	var u$1;
	var i;
	var o$1 = Object.is;
	var f$1 = 0;
	var c = [];
	var e = [];
	var a = n;
	var v = a.__b;
	var l = a.__r;
	var m = a.diffed;
	var s = a.__c;
	var h = a.unmount;
	var p = a.__;
	function y(n, t) {
		a.__h && a.__h(r, n, f$1 || t), f$1 = 0;
		var u = r.__H || (r.__H = {
			__: [],
			__h: []
		});
		return n >= u.__.length && u.__.push({}), u.__[n];
	}
	function d(n) {
		return f$1 = 1, _(G, n);
	}
	function _(n, u, i) {
		var f = y(t++, 2);
		if (f.t = n, !f.__c && (f.__ = [i ? i(u) : G(void 0, u), function(n) {
			var t = f.__N ? f.__N[0] : f.__[0], r = f.t(t, n);
			o$1(t, r) || (f.__N = [r, f.__[1]], f.__c.setState({}));
		}], f.__c = r, !r.__f)) {
			r.__f = !0;
			var c = r.shouldComponentUpdate;
			r.shouldComponentUpdate = function(n, t, r) {
				var u = this.__H;
				if (!u) return !0;
				var i = !1, f = this.props != n;
				if (u.__.some(function(n) {
					n.__N && (i = !0, o$1(n.__[0], n.__N[0]) || (f = !0));
				}), c) {
					var e = c.call(this, n, t, r);
					return i ? e || f : e;
				}
				return !i || f;
			};
		}
		return f.__;
	}
	function A(n, u) {
		var i = y(t++, 3);
		!a.__s && E(i.__H, u) && (i.__P = !0, i.__ = n, i.u = u, r.__H.__h.push(i));
	}
	function T(n) {
		return f$1 = 5, b(function() {
			return { current: n };
		}, []);
	}
	function b(n, r) {
		var u = y(t++, 7);
		return E(u.__H, r) && (u.__ = n(), u.__H = r), u.__;
	}
	function g() {
		var n;
		do {
			for (; n = e.shift();) try {
				C(n);
			} catch (t) {
				a.__e(t, { __: (n = n.__P) && n.__v });
			}
			for (; n = c.shift();) {
				var t = n.__H;
				if (n.__P && t) try {
					t.__h.some(C), t.__h.some(D), t.__h = [];
				} catch (r) {
					t.__h = [], a.__e(r, n.__v);
				}
			}
		} while (e.length);
	}
	a.__b = function(n) {
		r = null, v && v(n);
	}, a.__ = function(n, t) {
		n && t.__k && t.__k.__m && (n.__m = t.__k.__m), p && p(n, t);
	}, a.__r = function(n) {
		l && l(n), t = 0;
		var i = (r = n.__c).__H;
		i && (u$1 == r ? r.__h = [] : (i.__h.some(C), i.__h.some(D), t = 0), i.__h = [], i.__.some(function(n) {
			n.__N && (n.__ = n.__N), n.u = n.__N = void 0;
		})), u$1 = r;
	}, a.diffed = function(n) {
		m && m(n);
		var t = n.__c;
		t && t.__H && (t.__H.__h.length && B(c.push(t)), t.__H.__.some(function(n) {
			n.u && (n.__H = n.u);
		})), u$1 = r = null;
	}, a.__c = function(n, t) {
		t.some(function(n) {
			try {
				n.__h.some(C), n.__h = n.__h.filter(function(n) {
					return !n.__ || D(n);
				});
			} catch (r) {
				t.some(function(n) {
					n.__h && (n.__h = []);
				}), t = [], a.__e(r, n.__v);
			}
		}), s && s(n, t);
	}, a.unmount = function(n) {
		h && h(n);
		var t, r, u = n.__c;
		u && u.__H && (u.__H.__.some(function(u) {
			try {
				if (u.__P && u.__c) {
					if (void 0 === r) {
						for (r = n.__; r && (!r.__c || !r.__c.__P);) r = r.__;
						r = r && r.__c;
					}
					u.__P = r, B(e.push(u));
				} else C(u);
			} catch (n) {
				t = n;
			}
		}), u.__H = void 0, t && a.__e(t, u.__v));
	};
	var k = "function" == typeof requestAnimationFrame;
	function z(n) {
		var t, r = function() {
			clearTimeout(u), k && cancelAnimationFrame(t), setTimeout(n);
		}, u = setTimeout(r, 35);
		k && (t = requestAnimationFrame(r));
	}
	function B(n) {
		1 != n && i == a.requestAnimationFrame || ((i = a.requestAnimationFrame) || z)(g);
	}
	function C(n) {
		var t = r, u = n.__c;
		"function" == typeof u && (n.__c = void 0, u()), r = t;
	}
	function D(n) {
		var t = r;
		n.__c = n.__(), r = t;
	}
	function E(n, t) {
		return !n || n.length != t.length || t.some(function(t, r) {
			return !o$1(t, n[r]);
		});
	}
	function G(n, t) {
		return "function" == typeof t ? t(n) : t;
	}
	function formatRank(value) {
		return value === null ? "—" : `#${value.toLocaleString("en")}`;
	}
	function formatRankChange(value) {
		if (value === null || !Number.isFinite(value)) return "—";
		if (value > 0) return `+${value}`;
		return String(value);
	}
	function formatDate(value) {
		return value === null || !Number.isFinite(value) || value <= 0 ? "never" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
	}
	var o = 0;
	Array.isArray;
	function u(t, e, n$1, f, u, i) {
		e || (e = {});
		var a, c, l = e;
		if ("ref" in l && "function" != typeof t) for (c in l = {}, e) "ref" == c ? a = e[c] : l[c] = e[c];
		var p = {
			type: t,
			props: l,
			key: n$1,
			ref: a,
			__k: null,
			__: null,
			__b: 0,
			__e: null,
			__c: null,
			constructor: void 0,
			__v: --o,
			__i: -1,
			__u: 0
		};
		return (u || i) && (p.__source = u, p.__self = i), n.vnode && n.vnode(p), p;
	}
	function valueFor(record, key) {
		if (key === "domain") return record.domain;
		if (key === "globalRank") return record.stats?.globalRank ?? null;
		return record[key];
	}
	function sortRecords(records, key, direction) {
		const multiplier = direction === "asc" ? 1 : -1;
		return [...records].sort((left, right) => {
			const a = valueFor(left, key);
			const b = valueFor(right, key);
			if (a === null && b === null) return left.domain.localeCompare(right.domain);
			if (a === null) return 1;
			if (b === null) return -1;
			const compared = typeof a === "string" && typeof b === "string" ? a.localeCompare(b) : Number(a) - Number(b);
			return compared === 0 ? left.domain.localeCompare(right.domain) : compared * multiplier;
		});
	}
	function Leaderboard(props) {
		const [filter, setFilter] = d("");
		const [sortKey, setSortKey] = d("globalRank");
		const [direction, setDirection] = d("asc");
		const rows = b(() => sortRecords(props.records.filter((record) => record.domain.includes(filter.trim().toLowerCase())), sortKey, direction), [
			props.records,
			filter,
			sortKey,
			direction
		]);
		const applySort = (key) => {
			setSortKey(key);
			setDirection(key === "globalRank" || key === "domain" ? "asc" : "desc");
		};
		const changeSort = (key) => {
			if (key === sortKey) setDirection(direction === "asc" ? "desc" : "asc");
			else applySort(key);
		};
		return u("section", {
			class: "so-leaderboard",
			children: [
				u("div", {
					class: "so-tools",
					children: [u("label", { children: ["Filter domains", u("input", {
						"aria-label": "Filter domains",
						type: "search",
						value: filter,
						placeholder: "Search…",
						onInput: (event) => setFilter(event.currentTarget.value)
					})] }), u("div", {
						class: "so-sort",
						children: [u("label", { children: ["Sort", u("select", {
							"aria-label": "Sort leaderboard",
							value: sortKey,
							onChange: (event) => applySort(event.currentTarget.value),
							children: [
								u("option", {
									value: "globalRank",
									children: "Global rank"
								}),
								u("option", {
									value: "visitCount",
									children: "Visit count"
								}),
								u("option", {
									value: "domain",
									children: "Domain"
								}),
								u("option", {
									value: "lastVisitedAt",
									children: "Last visited"
								}),
								u("option", {
									value: "capturedAt",
									children: "Refreshed"
								})
							]
						})] }), u("button", {
							type: "button",
							title: `Reverse sort direction (${direction === "asc" ? "ascending" : "descending"})`,
							"aria-label": `Reverse sort direction, currently ${direction === "asc" ? "ascending" : "descending"}`,
							onClick: () => setDirection(direction === "asc" ? "desc" : "asc"),
							children: [
								direction === "desc" ? "↓" : "↑",
								" ",
								rows.length,
								"/",
								props.records.length
							]
						})]
					})]
				}),
				u("div", {
					class: "so-table",
					children: [u("div", {
						class: "so-tr so-th",
						children: [
							u("span", { children: "#" }),
							u("button", {
								type: "button",
								"aria-label": `Sort by domain, ${sortKey === "domain" ? direction : "inactive"}`,
								onClick: () => changeSort("domain"),
								children: ["Domain ", sortKey === "domain" ? direction === "asc" ? "↑" : "↓" : ""]
							}),
							u("button", {
								type: "button",
								"aria-label": `Sort by global rank, ${sortKey === "globalRank" ? direction : "inactive"}`,
								onClick: () => changeSort("globalRank"),
								children: ["Global Rank ", sortKey === "globalRank" ? direction === "asc" ? "↑" : "↓" : ""]
							}),
							u("button", {
								type: "button",
								"aria-label": `Sort by visit count, ${sortKey === "visitCount" ? direction : "inactive"}`,
								onClick: () => changeSort("visitCount"),
								children: ["Visits ", sortKey === "visitCount" ? direction === "asc" ? "↑" : "↓" : ""]
							}),
							u("span", {})
						]
					}), rows.map((record, index) => u("div", {
						class: `so-tr ${record.domain === props.currentDomain ? "is-current" : ""}`,
						children: [
							u("span", { children: String(index + 1).padStart(2, "0") }),
							u("button", {
								type: "button",
								class: "so-domain",
								onClick: () => props.onSelect(record),
								children: [record.domain, u("small", { children: [
									record.status,
									" · visited ",
									record.visitCount,
									"×"
								] })]
							}),
							u("span", {
								class: "so-rank-cell",
								children: [u("b", { children: formatRank(record.stats?.globalRank ?? null) }), record.stats?.globalRankChange != null && u("em", { children: formatRankChange(record.stats.globalRankChange) })]
							}),
							u("span", { children: [record.visitCount, "×"] }),
							u("button", {
								type: "button",
								class: "so-delete",
								"aria-label": `Delete ${record.domain}`,
								onClick: () => props.onDelete(record.domain),
								children: "×"
							})
						]
					}, record.domain))]
				}),
				!rows.length && u("p", {
					class: "so-empty-row",
					children: "No domains match this filter."
				}),
				u("footer", {
					class: "so-view-footer",
					children: [u("span", { children: [
						"Updated",
						" ",
						formatDate(props.records.reduce((max, record) => Math.max(max, record.capturedAt ?? 0), 0))
					] }), u("div", { children: [u("button", {
						type: "button",
						onClick: props.onExport,
						children: "Export JSON"
					}), u("button", {
						type: "button",
						onClick: props.onClear,
						children: "Clear all"
					})] })]
				})
			]
		});
	}
	function TrancoLink(props) {
		return u("a", {
			href: `https://tranco-list.eu/?query=${encodeURIComponent(props.domain)}`,
			target: "_blank",
			rel: "noreferrer",
			class: "so-btn-link",
			children: [props.label, " ↗"]
		});
	}
	function Unranked(props) {
		const unlisted = props.record.status === "no-data";
		return u("section", {
			class: "so-empty",
			children: [
				u("p", { children: unlisted ? "Domain outside Tranco Top 1M list (Unranked)." : "Global rank signal unavailable." }),
				!unlisted && props.record.errorCode && u("code", { children: props.record.errorCode }),
				u("div", {
					class: "so-empty-actions",
					children: [u("button", {
						type: "button",
						onClick: props.onRefresh,
						children: "Retry scan"
					}), u(TrancoLink, {
						domain: props.record.domain,
						label: "Tranco List"
					})]
				})
			]
		});
	}
	function Snapshot(props) {
		const stats = props.record.stats;
		if (!stats) return u(Unranked, {
			record: props.record,
			onRefresh: props.onRefresh
		});
		const history = stats.rankHistory;
		const ranks = history.map((p) => p.rank);
		const minRank = ranks.length ? Math.min(...ranks) : stats.globalRank ?? 0;
		const maxRank = ranks.length ? Math.max(...ranks) : stats.globalRank ?? 0;
		const rankSpread = Math.max(1, maxRank - minRank);
		return u("section", {
			class: "so-snapshot",
			children: [
				u("div", {
					class: "so-signal-meta",
					children: [u("span", { children: "TRANCO TOP 1M RANK" }), props.record.status === "error" ? u("span", { children: ["stale · ", props.record.errorCode ?? "refresh failed"] }) : props.collectionStatus === "loading" ? u("span", { children: "refreshing…" }) : null]
				}),
				stats.description && u("p", {
					class: "so-desc",
					children: [
						"“",
						stats.description,
						"”"
					]
				}),
				stats.globalRank !== null ? u(M, { children: [
					u("div", {
						class: "so-hero-zone",
						children: u("div", {
							class: "so-orbit",
							role: "img",
							"aria-label": `Global rank ${formatRank(stats.globalRank)}`,
							children: [
								u("i", {}),
								u("i", {}),
								u("div", { children: [
									u("small", { children: "GLOBAL RANK" }),
									u("strong", { children: formatRank(stats.globalRank) }),
									u("em", { children: stats.globalRankChange === null ? "—" : `${stats.globalRankChange > 0 ? "↑" : stats.globalRankChange < 0 ? "↓" : "="} ${formatRankChange(stats.globalRankChange)} (30d)` })
								] })
							]
						})
					}),
					history.length > 1 && u("div", {
						class: "so-sparkline-box",
						children: [u("div", {
							class: "so-sparkline-label",
							children: [u("span", { children: "30-Day Rank History" }), u("span", { children: [history.length, " snapshots"] })]
						}), u("div", {
							class: "so-sparkline-bars",
							role: "img",
							"aria-label": "30-day rank sparkline",
							children: history.slice(0, 30).reverse().map((point) => {
								const heightPct = 15 + (maxRank - point.rank) / rankSpread * 75;
								return u("span", {
									title: `${point.date}: #${point.rank.toLocaleString()}`,
									style: { height: `${heightPct}%` }
								}, point.date);
							})
						})]
					}),
					u("div", {
						class: "so-ranks",
						children: [
							u("div", { children: [
								u("small", { children: "CURRENT" }),
								u("b", { children: formatRank(stats.globalRank) }),
								u("em", { children: formatRankChange(stats.globalRankChange) })
							] }),
							u("div", { children: [
								u("small", { children: "30D PEAK" }),
								u("b", { children: formatRank(minRank) }),
								u("em", { children: "best" })
							] }),
							u("div", { children: [
								u("small", { children: "30D LOW" }),
								u("b", { children: formatRank(maxRank) }),
								u("em", { children: "trough" })
							] })
						]
					})
				] }) : u(Unranked, {
					record: props.record,
					onRefresh: props.onRefresh
				}),
				stats.tech && stats.tech.length > 0 && u(M, { children: [u("div", {
					class: "so-section-title",
					children: [u("span", { children: "TECH STACK DETECTED" }), u("small", { children: [stats.tech.length, " detected"] })]
				}), u("div", {
					class: "so-badges",
					children: stats.tech.map((t) => u("span", {
						class: `so-badge is-${t.category}`,
						children: t.name
					}, t.name))
				})] }),
				stats.dns && u(M, { children: [u("div", {
					class: "so-section-title",
					children: u("span", { children: "INFRASTRUCTURE & DNS" })
				}), u("div", {
					class: "so-telemetry-grid",
					children: [u("div", {
						class: "so-telemetry-card",
						children: [
							u("small", { children: "DNS / CDN" }),
							u("strong", { children: stats.dns.nameserverProvider ?? "Custom DNS" }),
							stats.dns.nameservers[0] && u("em", { children: stats.dns.nameservers[0] })
						]
					}), u("div", {
						class: "so-telemetry-card",
						children: [
							u("small", { children: "MAIL SERVER" }),
							u("strong", { children: stats.dns.mailProvider ?? "Custom / None" }),
							stats.dns.mailServers[0] && u("em", { children: stats.dns.mailServers[0] })
						]
					})]
				})] }),
				stats.performance && u(M, { children: [u("div", {
					class: "so-section-title",
					children: [u("span", { children: "PAGE PERFORMANCE" }), stats.performance.protocol && u("small", { children: stats.performance.protocol })]
				}), u("div", {
					class: "so-telemetry-grid",
					children: [
						u("div", {
							class: "so-telemetry-card",
							children: [u("small", { children: "TIME TO FIRST BYTE" }), u("strong", { children: stats.performance.ttfbMs !== null ? `${stats.performance.ttfbMs} ms` : "—" })]
						}),
						u("div", {
							class: "so-telemetry-card",
							children: [u("small", { children: "PAGE LOAD TIME" }), u("strong", { children: stats.performance.loadTimeMs !== null ? `${(stats.performance.loadTimeMs / 1e3).toFixed(2)} s` : "—" })]
						}),
						u("div", {
							class: "so-telemetry-card",
							children: [u("small", { children: "TOTAL TRANSFERRED" }), u("strong", { children: stats.performance.transferBytes !== null ? `${(stats.performance.transferBytes / 1024).toFixed(1)} KB` : "—" })]
						}),
						u("div", {
							class: "so-telemetry-card",
							children: [u("small", { children: "TOTAL REQUESTS" }), u("strong", { children: [stats.performance.resourceCount, " assets"] })]
						})
					]
				})] }),
				u("div", {
					class: "so-section-title",
					children: [u("span", { children: "OBSERVATORY TELEMETRY" }), u(TrancoLink, {
						domain: props.record.domain,
						label: "Tranco Report"
					})]
				}),
				u("dl", {
					class: "so-metrics",
					children: [
						u("div", { children: [u("dt", { children: "Local visits" }), u("dd", { children: [props.record.visitCount, "×"] })] }),
						u("div", { children: [u("dt", { children: "First seen" }), u("dd", { children: formatDate(props.record.firstVisitedAt) })] }),
						u("div", { children: [u("dt", { children: "Last visit" }), u("dd", { children: formatDate(props.record.lastVisitedAt) })] })
					]
				})
			]
		});
	}
	function App(props) {
		const [tab, setTab] = d("snapshot");
		const [selectedDomain, setSelectedDomain] = d(props.domain);
		const [refreshingDomain, setRefreshingDomain] = d(null);
		const panelRef = T(null);
		const selectedRecord = (selectedDomain === props.domain ? props.currentRecord : props.records.find((record) => record.domain === selectedDomain)) ?? props.currentRecord;
		A(() => {
			panelRef.current?.focus();
			const onKeyDown = (event) => {
				if (event.key === "Escape") props.onClose();
			};
			document.addEventListener("keydown", onKeyDown);
			return () => {
				document.removeEventListener("keydown", onKeyDown);
			};
		}, [props.onClose]);
		const current = tab === "snapshot" ? selectedRecord : props.currentRecord;
		const isLoading = refreshingDomain === current.domain || current.domain === props.domain && props.collectionStatus === "loading";
		const triggerRefresh = async () => {
			setRefreshingDomain(current.domain);
			try {
				await props.onRefresh(current.domain);
			} finally {
				setRefreshingDomain(null);
			}
		};
		return u("div", {
			class: "so-panel",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": "SiteOrbit",
			tabIndex: -1,
			ref: panelRef,
			children: [
				u("header", {
					class: "so-header",
					children: [u("div", {
						class: "so-header-title",
						children: [u("small", { children: "SITEORBIT · OBSERVATORY" }), u("div", {
							class: "so-header-brand",
							children: [u("img", {
								src: current.stats?.faviconUrl ?? faviconUrl(current.domain),
								alt: "",
								class: "so-favicon",
								onError: (event) => {
									event.currentTarget.style.visibility = "hidden";
								}
							}), u("strong", { children: current.domain })]
						})]
					}), u("div", {
						class: "so-header-actions",
						children: [u("button", {
							type: "button",
							class: `so-icon-btn ${isLoading ? "is-spinning" : ""}`,
							"aria-label": "Refresh global rank signal",
							title: "Refresh global rank signal",
							disabled: isLoading,
							onClick: triggerRefresh,
							children: u("svg", {
								viewBox: "0 0 16 16",
								"aria-hidden": "true",
								children: u("path", { d: "M13.65 2.35A7.958 7.958 0 0 0 8 0a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24l-2.24 2.24h6V0l-2.35 2.35z" })
							})
						}), u("button", {
							type: "button",
							class: "so-icon-btn",
							"aria-label": "Close SiteOrbit",
							title: "Close (Esc)",
							onClick: props.onClose,
							children: "✕"
						})]
					})]
				}),
				u("div", {
					class: "so-tabs",
					role: "tablist",
					"aria-label": "SiteOrbit sections",
					children: [u("button", {
						type: "button",
						role: "tab",
						id: "so-tab-snapshot",
						"aria-controls": "so-tabpanel",
						"aria-selected": tab === "snapshot",
						onClick: () => setTab("snapshot"),
						children: "Snapshot"
					}), u("button", {
						type: "button",
						role: "tab",
						id: "so-tab-leaderboard",
						"aria-controls": "so-tabpanel",
						"aria-selected": tab === "leaderboard",
						onClick: () => setTab("leaderboard"),
						children: ["Leaderboard · ", props.records.length]
					})]
				}),
				u("div", {
					class: "so-content",
					id: "so-tabpanel",
					role: "tabpanel",
					"aria-labelledby": tab === "snapshot" ? "so-tab-snapshot" : "so-tab-leaderboard",
					children: tab === "snapshot" ? u(Snapshot, {
						record: selectedRecord,
						collectionStatus: refreshingDomain === selectedRecord.domain ? "loading" : selectedRecord.domain === props.domain ? props.collectionStatus : selectedRecord.status,
						onRefresh: triggerRefresh
					}) : u(Leaderboard, {
						records: props.records,
						currentDomain: props.domain,
						onSelect: (record) => {
							setSelectedDomain(record.domain);
							setTab("snapshot");
						},
						onDelete: props.onDelete,
						onClear: props.onClear,
						onExport: props.onExport
					})
				})
			]
		});
	}
	var STYLES = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
button, input, select { font: inherit; }
button { cursor: pointer; }

:focus-visible {
  outline: 2px solid #ff7048;
  outline-offset: 2px;
}

.so-panel {
  outline: none;
  --bg: #07130f;
  --surface: #0b1b14;
  --surface-2: #10261a;
  --line: #28523a;
  --ink: #b9f5ce;
  --muted: #8eb39d;
  --signal: #ff7048;
  position: fixed;
  top: 18px;
  right: 18px;
  pointer-events: auto;
  width: min(480px, calc(100vw - 36px));
  height: min(750px, calc(100vh - 36px));
  display: flex;
  flex-direction: column;
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px var(--line);
  font-size: 13px;
  overflow: hidden;
}

.so-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.so-header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.so-header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.so-favicon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: contain;
  background: var(--surface);
}
.so-header small, .so-signal-meta, .so-section-title, .so-sparkline-label {
  color: var(--muted);
  font: 10px ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.so-header strong {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -.02em;
  color: var(--ink);
}
.so-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.so-icon-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  font-size: 15px;
  line-height: 1;
  transition: all 0.15s ease;
}
.so-icon-btn:not(:disabled):hover {
  border-color: var(--signal);
  color: var(--signal);
}
.so-icon-btn:disabled {
  opacity: .55;
  cursor: default;
}
.so-icon-btn:not(:disabled):active {
  background: var(--signal);
  color: var(--bg);
  border-color: var(--signal);
}
.so-icon-btn svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
.so-icon-btn.is-spinning svg {
  animation: so-spin 0.8s linear infinite;
}

.so-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.so-tabs button {
  position: relative;
  padding: 10px 16px;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--line);
  text-align: left;
  font-size: 12px;
}
.so-tabs button:last-child { border-right: 0; }
.so-tabs button[aria-selected="true"] {
  color: var(--ink);
  background: var(--bg);
  font-weight: 500;
}
.so-tabs button[aria-selected="true"]::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--signal);
  content: "";
}

.so-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.so-snapshot, .so-leaderboard {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.so-signal-meta {
  display: flex;
  justify-content: space-between;
  padding: 14px 18px 0;
}
.so-signal-meta span:last-child { color: var(--signal); }

.so-desc {
  padding: 8px 18px 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
  margin: 0;
}

.so-hero-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 18px 18px 12px;
  position: relative;
}
.so-orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 156px;
  height: 156px;
  margin: 0 auto;
}
.so-orbit>i:first-child {
  position: absolute;
  inset: 0;
  border: 1px dashed #47db7b;
  border-radius: 50%;
  animation: so-spin 20s linear infinite;
}
.so-orbit>i:nth-child(2) {
  position: absolute;
  inset: 18px;
  border: 1px solid var(--signal);
  border-radius: 50%;
  animation: so-spin 12s linear infinite reverse;
}
.so-orbit>div {
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.so-orbit small {
  color: var(--muted);
  font: 10px ui-monospace, monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.so-orbit strong {
  font: 600 28px ui-monospace, monospace;
  letter-spacing: -.05em;
  color: var(--ink);
  margin: 2px 0;
}
.so-orbit em {
  color: var(--signal);
  font: 700 12px ui-monospace, monospace;
}

.so-sparkline-box {
  padding: 0 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.so-sparkline-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.so-sparkline-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 30px;
  background: var(--surface);
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 4px;
}
.so-sparkline-bars span {
  flex: 1;
  min-height: 4px;
  background: var(--signal);
  border-radius: 1px;
  opacity: 0.85;
}
.so-sparkline-bars span:hover {
  opacity: 1;
  background: #47db7b;
}

.so-ranks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-block: 1px solid var(--line);
}
.so-ranks>div { padding: 10px 14px; border-right: 1px solid var(--line); }
.so-ranks>div:last-child { border-right: 0; }
.so-ranks small, .so-ranks em { display: block; color: var(--muted); font: 10px ui-monospace, monospace; }
.so-ranks b { display: block; margin: 3px 0; font: 500 15px ui-monospace, monospace; }

.so-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px 6px;
}

.so-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 18px 12px;
}
.so-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font: 11px ui-monospace, monospace;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
}
.so-badge.is-framework { border-color: #47db7b; color: #a3f7c4; }
.so-badge.is-cms { border-color: #58a6ff; color: #a5d6ff; }
.so-badge.is-ui { border-color: #d2a8ff; color: #e2c5ff; }
.so-badge.is-analytics { border-color: #f0883e; color: #ffc69d; }
.so-badge.is-cdn { border-color: #f778ba; color: #ffb8df; }
.so-badge.is-observability { border-color: #79c0ff; color: #cbe6ff; }

.so-telemetry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 18px 12px;
}
.so-telemetry-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.so-telemetry-card small {
  color: var(--muted);
  font: 10px ui-monospace, monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.so-telemetry-card strong {
  color: var(--ink);
  font: 500 13px ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.so-telemetry-card em {
  font: 10px ui-monospace, monospace;
  color: var(--signal);
  font-style: normal;
}

.so-metrics { margin: 0; padding: 0 18px 12px; }
.so-metrics>div { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); }
.so-metrics dt { color: var(--muted); }
.so-metrics dd { margin: 0; font-family: ui-monospace, monospace; }

.so-empty { display: grid; place-items: start; gap: 10px; min-height: 180px; padding: 25px 20px; }
.so-empty p { margin: 0; font-size: 14px; }
.so-empty code { color: var(--signal); }
.so-empty-actions { display: flex; align-items: center; gap: 16px; margin-top: 4px; }
.so-btn-link { color: var(--muted); text-decoration: none; font: 11px ui-monospace, monospace; }
.so-btn-link:hover { color: var(--signal); text-decoration: underline; }

.so-tools { display: flex; align-items: end; justify-content: space-between; gap: 12px; padding: 12px 18px 8px; color: var(--muted); font: 10px ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase; flex-shrink: 0; }
.so-tools label { flex: 1; }
.so-tools input { display: block; width: 100%; margin-top: 4px; padding: 7px 9px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 4px; }
.so-tools input:focus-visible { border-color: var(--signal); }
.so-sort { display: flex; align-items: end; gap: 5px; }
.so-sort label { min-width: 110px; }
.so-sort select { display: block; width: 100%; margin-top: 4px; padding: 6px 18px 6px 8px; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 4px; }
.so-sort button { height: 30px; padding: 0 8px; color: var(--signal); background: transparent; border: 1px solid var(--line); border-radius: 4px; }

.so-table { padding: 0 18px; flex: 1; }
.so-tr { display: grid; grid-template-columns: 24px minmax(130px, 1fr) 85px 55px 22px; gap: 8px; align-items: center; min-height: 44px; padding: 3px 5px; border-bottom: 1px solid var(--line); font: 11px ui-monospace, monospace; }
.so-tr>*:nth-child(3), .so-tr>*:nth-child(4) { text-align: right; }
.so-th { min-height: 28px; color: var(--muted); font-size: 10px; text-transform: uppercase; }
.so-th button { color: var(--muted); background: transparent; border: 0; text-align: left; padding: 0; }
.so-th button:nth-child(n+3) { text-align: right; }
.so-tr.is-current { background: var(--surface-2); box-shadow: inset 3px 0 var(--signal); }
.so-domain { display: flex; flex-direction: column; gap: 2px; overflow: hidden; color: var(--ink); background: transparent; border: 0; text-align: left; padding: 0; }
.so-domain small { overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.so-rank-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.so-rank-cell b { font-weight: 500; }
.so-rank-cell em { color: var(--muted); font-style: normal; font-size: 10px; }
.so-delete { width: 22px; height: 22px; color: var(--muted); background: transparent; border: 0; border-radius: 3px; display: grid; place-items: center; font-size: 14px; padding: 0; }
.so-delete:hover { color: var(--signal); background: rgba(255, 112, 72, 0.1); }
.so-empty-row { margin: 20px 18px; color: var(--muted); }

.so-view-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding: 10px 18px;
  color: var(--muted);
  border-top: 1px solid var(--line);
  background: var(--bg);
  font: 11px ui-monospace, monospace;
  flex-shrink: 0;
}
.so-view-footer div { display: flex; gap: 10px; }
.so-view-footer button, .so-empty button { padding: 3px 8px; color: var(--signal); background: transparent; border: 1px solid var(--line); border-radius: 4px; font-weight: 500; }
.so-view-footer button:hover, .so-empty button:hover { border-color: var(--signal); }
.so-view-footer button:active, .so-empty button:active { background: var(--signal); color: var(--bg); }

@keyframes so-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .so-orbit>i, .so-icon-btn.is-spinning svg { animation: none; } }
@media (max-width: 600px) {
  .so-panel { top: 8px; right: 8px; left: 8px; width: auto; height: calc(100vh - 16px); }
  .so-tr { grid-template-columns: 22px minmax(90px, 1fr) 70px 22px; }
  .so-tr>*:nth-child(4) { display: none; }
  .so-telemetry-grid { grid-template-columns: 1fr; }
}
`;
	var activeClose = null;
	function PanelRoot(props) {
		const [record, setRecord] = d(null);
		const [records, setRecords] = d([]);
		const [state, setState] = d({
			status: "idle",
			record: null
		});
		const reload = async () => {
			setRecord(await props.repository.get(props.domain));
			setRecords(await props.repository.list());
		};
		A(() => {
			reload();
			return props.collector.subscribe(props.domain, (next) => {
				setState(next);
				if (next.record) setRecord(next.record);
				props.repository.list().then(setRecords);
			});
		}, [props.domain]);
		if (!record) return u("div", {
			class: "so-panel so-empty",
			children: "Initializing local signal…"
		});
		return u(App, {
			domain: props.domain,
			currentRecord: record,
			records,
			collectionStatus: state.status,
			onRefresh: async (domain) => {
				await props.collector.collect(domain, true);
				await reload();
			},
			onDelete: (domain) => {
				if (!confirm(`Delete ${domain} from SiteOrbit?`)) return;
				props.repository.delete(domain).then(domain === props.domain ? props.close : reload);
			},
			onClear: () => {
				if (confirm("Clear every SiteOrbit record?")) props.repository.clear().then(props.close);
			},
			onExport: () => void props.repository.exportJson().then((json) => props.download("site-orbit.json", json)),
			onClose: props.close
		});
	}
	async function mountPanel(domain, repository, collector, download) {
		activeClose?.();
		const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const host = document.createElement("site-orbit-panel");
		const root = host.attachShadow({ mode: "closed" });
		const style = document.createElement("style");
		const container = document.createElement("div");
		container.style.display = "contents";
		style.textContent = STYLES;
		root.append(style, container);
		document.documentElement.append(host);
		let closed = false;
		const onOutsidePointerDown = (event) => {
			if (!event.composedPath().includes(host)) close();
		};
		const close = () => {
			if (closed) return;
			closed = true;
			window.removeEventListener("pointerdown", onOutsidePointerDown, true);
			G$1(null, container);
			host.remove();
			if (activeClose === close) activeClose = null;
			previousFocus?.focus();
		};
		activeClose = close;
		window.addEventListener("pointerdown", onOutsidePointerDown, true);
		G$1(u(PanelRoot, {
			domain,
			repository,
			collector,
			close,
			download
		}), container);
	}
	function closePanel() {
		activeClose?.();
	}
	function togglePanel(domain, repository, collector, download) {
		if (activeClose) activeClose();
		else mountPanel(domain, repository, collector, download);
	}
	function createServices(repository, collector, download, registerMenu) {
		return {
			touch: async (domain) => {
				await repository.touch(domain);
			},
			collect: (domain) => collector.collect(domain),
			registerMenu,
			openPanel: (domain) => mountPanel(domain, repository, collector, download),
			togglePanel: (domain) => togglePanel(domain, repository, collector, download),
			clearCache: async () => {
				if (confirm("Clear every SiteOrbit record from local cache?")) {
					await repository.clear();
					closePanel();
				}
			}
		};
	}
	var CACHE_TTL_MS = 2592e6;
	var FAILURE_RETRY_MS = 216e5;
	var RECORD_PREFIX = "site-orbit:record:";
	var LOCK_PREFIX = "site-orbit:lock:";
	var UPDATE_LOCK_PREFIX = "site-orbit:update-lock:";
	function recordKey(domain) {
		return `${RECORD_PREFIX}${domain}`;
	}
	function lockKey(domain) {
		return `${LOCK_PREFIX}${domain}`;
	}
	function isObject(value) {
		return typeof value === "object" && value !== null;
	}
	function isNullableNumber(value) {
		return value === null || typeof value === "number" && Number.isFinite(value);
	}
	function isSiteRecord(value, domain) {
		if (!isObject(value) || value.schemaVersion !== 1 || value.domain !== domain) return false;
		if (!isNullableNumber(value.firstVisitedAt) || !isNullableNumber(value.lastVisitedAt) || typeof value.visitCount !== "number" || !isNullableNumber(value.capturedAt) || !isNullableNumber(value.expiresAt) || !isNullableNumber(value.retryAfter) || value.errorCode !== null && typeof value.errorCode !== "string" || ![
			"ready",
			"no-data",
			"error"
		].includes(String(value.status))) return false;
		if (value.stats === null) return true;
		const stats = value.stats;
		if (!isObject(stats) || stats.domain !== domain) return false;
		return Array.isArray(stats.rankHistory);
	}
	var SiteRepository = class {
		storage;
		now;
		constructor(storage, now = Date.now) {
			this.storage = storage;
			this.now = now;
		}
		async touch(domain) {
			return await this.mutate(domain, (current) => {
				const timestamp = this.now();
				return current ? {
					...current,
					lastVisitedAt: timestamp,
					visitCount: current.visitCount + 1
				} : this.emptyRecord(domain, timestamp);
			});
		}
		async get(domain) {
			const value = await this.storage.get(recordKey(domain), null);
			if (!isSiteRecord(value, domain)) {
				if (value !== null) await this.storage.delete(recordKey(domain));
				return null;
			}
			return value;
		}
		async saveSuccess(domain, stats) {
			return await this.mutate(domain, (current) => {
				const timestamp = this.now();
				return {
					...current ?? this.emptyRecord(domain, timestamp),
					capturedAt: timestamp,
					expiresAt: timestamp + CACHE_TTL_MS,
					status: "ready",
					retryAfter: null,
					errorCode: null,
					stats
				};
			});
		}
		async saveFailure(domain, code) {
			return await this.mutate(domain, (current) => {
				const timestamp = this.now();
				return {
					...current ?? this.emptyRecord(domain, timestamp),
					status: "error",
					retryAfter: timestamp + FAILURE_RETRY_MS,
					errorCode: code
				};
			});
		}
		async saveNoData(domain, stats = null) {
			return await this.mutate(domain, (current) => {
				const timestamp = this.now();
				return {
					...current ?? this.emptyRecord(domain, timestamp),
					capturedAt: timestamp,
					expiresAt: timestamp + CACHE_TTL_MS,
					status: "no-data",
					retryAfter: null,
					errorCode: "no-data",
					stats
				};
			});
		}
		needsCollection(record, force = false) {
			if (force || !record) return true;
			const deadline = record.status === "error" ? record.retryAfter : record.expiresAt;
			return !deadline || deadline <= this.now();
		}
		async acquireLock(domain, owner, ttl) {
			return await this.acquireStorageLock(lockKey(domain), owner, ttl);
		}
		async isLocked(domain) {
			const current = await this.storage.get(lockKey(domain), null);
			return Boolean(current && current.expiresAt > this.now());
		}
		async releaseLock(domain, owner) {
			await this.releaseStorageLock(lockKey(domain), owner);
		}
		async list() {
			const domains = (await this.storage.keys()).filter((key) => key.startsWith(RECORD_PREFIX)).map((key) => key.slice(18));
			return (await Promise.all(domains.map((domain) => this.get(domain)))).filter((record) => record !== null).sort((a, b) => a.domain.localeCompare(b.domain));
		}
		async delete(domain) {
			await this.storage.delete(recordKey(domain));
		}
		async clear() {
			const keys = await this.storage.keys();
			await Promise.all(keys.filter((key) => key.startsWith(RECORD_PREFIX) || key.startsWith(LOCK_PREFIX) || key.startsWith(UPDATE_LOCK_PREFIX)).map((key) => this.storage.delete(key)));
		}
		async exportJson() {
			return JSON.stringify(await this.list(), null, 2);
		}
		async acquireStorageLock(key, owner, ttl) {
			const current = await this.storage.get(key, null);
			if (current && current.expiresAt > this.now() && current.owner !== owner) return false;
			await this.storage.set(key, {
				owner,
				expiresAt: this.now() + ttl
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
			return (await this.storage.get(key, null))?.owner === owner;
		}
		async releaseStorageLock(key, owner) {
			if ((await this.storage.get(key, null))?.owner === owner) await this.storage.delete(key);
		}
		async mutate(domain, update) {
			const key = `${UPDATE_LOCK_PREFIX}${domain}`;
			const owner = `${this.now()}-${Math.random().toString(36).slice(2)}`;
			for (let attempt = 0; attempt < 50; attempt++) {
				if (await this.acquireStorageLock(key, owner, 2e3)) try {
					const record = update(await this.get(domain));
					await this.write(record);
					return record;
				} finally {
					await this.releaseStorageLock(key, owner);
				}
				await new Promise((resolve) => setTimeout(resolve, 20));
			}
			throw new Error(`record-lock-timeout:${domain}`);
		}
		emptyRecord(domain, timestamp) {
			return {
				schemaVersion: 1,
				domain,
				firstVisitedAt: timestamp,
				lastVisitedAt: timestamp,
				visitCount: 1,
				capturedAt: null,
				expiresAt: null,
				status: "error",
				retryAfter: null,
				errorCode: "not-collected",
				stats: null
			};
		}
		async write(record) {
			await this.storage.set(recordKey(record.domain), record);
		}
	};
	var repository = new SiteRepository(gmStorage);
	var collector = new Collector(repository, gmHttp, () => crypto.randomUUID());
	boot(location.href, createServices(repository, collector, downloadJson, registerMenu)).catch((error) => {
		console.warn("[SiteOrbit] startup failed", error);
	});
})();
