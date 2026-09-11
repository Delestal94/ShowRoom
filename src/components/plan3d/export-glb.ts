/**
 * Exporta el modelo extruido a GLB.
 *
 * Reconstruye la escena con three "a mano" en vez de tomarla del visor: el
 * árbol de react-three-fiber trae helpers (grilla, luces, controles) que no
 * deberían viajar dentro del archivo, y así el GLB sale con la misma geometría
 * que ya acepta el visor del storefront.
 */

import type { PlanModel } from './plan-model'
import { buildSlab, buildWallPieces } from './plan-model'

export async function exportPlanToGlb(model: PlanModel, name: string): Promise<Blob> {
  const [THREE, { GLTFExporter }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/exporters/GLTFExporter.js'),
  ])

  const group = new THREE.Group()
  group.name = name

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.8 })
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fd4e8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
  })
  const slabMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.95 })

  const slab = buildSlab(model)
  if (slab?.kind === 'box') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...slab.size), slabMaterial)
    mesh.position.set(...slab.position)
    mesh.name = 'losa'
    group.add(mesh)
  } else if (slab?.kind === 'polygon') {
    // Mismo shape (x, -z) + rotateX(-90°) + translate que el visor, para
    // que el GLB publicado coincida con lo que se ve en el editor.
    const [first, ...rest] = slab.polygon.points
    const shape = new THREE.Shape()
    shape.moveTo(first[0], -first[1])
    for (const [x, z] of rest) shape.lineTo(x, -z)
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: slab.polygon.thickness,
      bevelEnabled: false,
      curveSegments: 1,
    })
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, -slab.polygon.thickness, 0)
    const mesh = new THREE.Mesh(geometry, slabMaterial)
    mesh.name = 'losa'
    group.add(mesh)
  }

  for (const piece of buildWallPieces(model)) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...piece.size),
      piece.glass ? glassMaterial : wallMaterial
    )
    mesh.position.set(...piece.position)
    mesh.rotation.y = piece.rotationY
    mesh.name = piece.key
    group.add(mesh)
  }

  const exporter = new GLTFExporter()
  const result = await exporter.parseAsync(group, { binary: true })
  return new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })
}
