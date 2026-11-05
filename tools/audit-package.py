"""Verify the distributable against the source resources without executing it."""
from pathlib import Path
import hashlib, io, json, re, statistics, struct, zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
version = json.loads((ROOT/'src/manifest.json').read_text('utf8'))['versionName']
package = ROOT / f'dist/com.codex.maitetsu.rw5.debug.{version}.rpk'
raw = package.read_bytes()
assert len(raw) < 25_000_000
assert len(raw) < 10_000_000
assert len(raw) % 16 == 1
resources = []
with zipfile.ZipFile(package) as archive:
    assert archive.testzip() is None
    entries = [i for i in archive.infolist() if not i.is_dir()]
    assert len({i.filename for i in entries}) == len(entries)
    manifest = json.loads(archive.read('manifest.json'))
    assert manifest['package'] == 'com.codex.maitetsu.rw5'
    assert manifest['name'] == '爱上火车'
    assert manifest['icon'] == '/common/logo.png'
    for source in sorted((ROOT / 'src/common').rglob('*')):
        if not source.is_file() or source.suffix == '.js':
            continue
        name = source.relative_to(ROOT / 'src').as_posix()
        data = source.read_bytes()
        assert archive.read(name) == data, name
        resources.append(dict(name=name, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    binary = [i for i in entries if re.search(r'\.(png|jpe?g|wav|ttf)$', i.filename, re.I)]
    assert all(i.compress_type == zipfile.ZIP_STORED for i in binary)
    deflated = [i for i in entries if i.compress_type == zipfile.ZIP_DEFLATED]
    icon = archive.read('common/logo.png')
    width, height, bits, color_type = struct.unpack_from('>IIBB', icon, 16)
    assert (width, height, bits, color_type) == (128, 128, 8, 6)
    with Image.open(io.BytesIO(icon)) as image:
        alpha = image.getchannel('A')
        assert alpha.getpixel((64, 64)) == 255
        assert all(alpha.getpixel(point) == 0 for point in ((0, 0), (127, 0), (0, 127), (127, 127)))
        assert any(alpha.histogram()[1:255])
    counts = []
    image_sizes = {}
    for entry in binary:
        if entry.filename.startswith('common/images/'):
            with Image.open(io.BytesIO(archive.read(entry))) as image:
                image.load()
                image_sizes[entry.filename] = image.size
    max_layers = 0
    decoded_per_frame = []
    scenes = set()
    for chapter in range(1, 5):
        lines = []
        for source in sorted((ROOT / 'src/common/story').glob(f'{chapter}-*.txt'), key=lambda p: int(p.stem.split('-')[1])):
            chunk = json.loads(source.read_text('utf8'));rows=chunk['lines']
            assert chunk['v']==2 and len(rows) <= 48
            for speaker, text, scene_index in rows:
                assert isinstance(text, str)
                assert not re.search(r'\\x|%l|#[0-9a-f]{8};',text,re.I)
                scene = chunk['scenes'][scene_index]
                scenes.add(scene['id'])
                layers = scene['layers']
                assert len(layers) <= 4
                assert len({actor['image'] for actor in layers}) == len(layers)
                max_layers = max(max_layers, len(layers))
                decoded = 0
                for actor in layers:
                    intrinsic_width, intrinsic_height = image_sizes['common/images/' + actor['image']]
                    assert 0<=actor['x'] and actor['x']+actor['w']<=432
                    assert 21<=actor['y'] and actor['y']+actor['h']<=264
                    decoded += intrinsic_width * intrinsic_height * 4
                decoded_per_frame.append(decoded)
            lines.extend(rows)
        counts.append(len(lines))
    assert counts == [354, 345, 368, 470]
    gallery = json.loads(archive.read('common/gallery.txt'))
    assert len(gallery) == 35 and len({i['group'] for i in gallery}) == 6
    groups = set()
    for item in gallery:
        assert 'common/images/' + item['image'] in image_sizes
        if item['group'] not in groups:
            groups.add(item['group'])
            thumb_width, thumb_height = image_sizes['common/images/' + item['thumbnail']]
            assert thumb_width <= 180 and thumb_height <= 116
    assert max(decoded_per_frame) <= 325_000
report = dict(passed=True, packageBytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
              manifest=manifest, sourceResourcesMatched=len(resources), crcPassed=True,
              chapterParagraphs=counts, paragraphs=sum(counts),
              pngIcon=dict(size=[width,height],bits=bits,colorType=color_type,circularAlpha=True), zipFiles=len(entries),
              uniqueScenes=len(scenes), maxSceneLayers=max_layers,
              medianSceneDecodedRGBABytes=statistics.median(decoded_per_frame),
              maxSceneDecodedRGBABytes=max(decoded_per_frame),
              deflatedFiles=len(deflated), largestDeflatedUncompressedBytes=max((i.file_size for i in deflated),default=0),
              deflatedUncompressedBytes=sum(i.file_size for i in deflated), imagesAndPcmStored=True,
              actualFirmwareHeapNotMeasured=True, physicalDeviceTested=False, resources=resources)
(ROOT / 'reports/package-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k not in ['manifest','resources']}, ensure_ascii=False))
